import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

export interface SourceFile {
  name: string;
  mimeType: string;
  data: string; // base64 for PDF, plain text for others
}

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3, baseDelay = 2000): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;
      const errorMessage = error?.message || error?.toString() || '';
      const isRetryable = errorMessage.includes('503') || errorMessage.includes('429') || errorMessage.includes('high demand') || errorMessage.includes('UNAVAILABLE');
      
      if (attempt >= maxRetries || !isRetryable) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`API call failed with transient error, retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries reached");
}

export async function planImagePresentation(topic: string, sources: string, sourceFiles: SourceFile[], slideCount: number, style: string, language: string = 'English') {
  const ai = getAI();
  const prompt = `You are an expert presentation designer. Based on the topic "${topic}" and the provided sources, create a presentation outline.
  
  CRITICAL INSTRUCTION: If the provided sources (especially Markdown files) contain a specific slide-by-slide outline or explicitly state the number of slides, you MUST strictly follow that structure and generate exactly that number of slides with the specified content. 
  If and ONLY IF the sources do not specify the structure or slide count, create a ${slideCount}-slide presentation outline.

  The presentation will be generated as full-slide images.
  For each slide, provide:
  1. title: The slide title.
  2. keyPoints: An array of 2-4 short bullet points.
  3. imagePrompt: A detailed visual description for an AI image generator to create the slide. It MUST incorporate the title and keyPoints into the visual design description, and follow the global style: "${style}".
  4. layout: A brief description of the layout (e.g., "Title top left, points on right, illustration on left").
  
  IMPORTANT: The 'title' and 'keyPoints' MUST be written in ${language}. The 'imagePrompt' and 'layout' should remain in English for the image generator.`;

  const parts: any[] = [{ text: prompt }];
  if (sources) parts.push({ text: `\n\n--- Sources ---\n${sources}\n` });

  for (const file of sourceFiles) {
    if (file.mimeType === 'application/pdf') {
      parts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
    } else {
      parts.push({ text: `\n\n--- Content from ${file.name} ---\n${file.data}\n` });
    }
  }

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            imagePrompt: { type: Type.STRING },
            layout: { type: Type.STRING }
          },
          required: ['title', 'keyPoints', 'imagePrompt', 'layout']
        }
      }
    }
  }));

  const text = response.text;
  if (text) return JSON.parse(text);
  return [];
}

export async function analyzePDFPresentation(pdfFile: SourceFile, style: string, language: string = 'English') {
  const ai = getAI();
  const prompt = `You are an expert presentation analyzer and reverse-engineer. I have provided a PDF of a presentation. Please analyze it page by page to extract its exact visual DNA so it can be perfectly recreated.
  Global Style: ${style}
  
  For each slide in the PDF, provide:
  1. title: The slide title.
  2. keyPoints: An array of 2-4 short bullet points summarizing the text.
  3. imagePrompt: A highly detailed, exhaustive visual description for an AI image generator to recreate this exact slide. Include specific details about background colors, typography styles (serif/sans-serif, weight), spatial arrangement, shapes, borders, and any illustrations or photos. The goal is a pixel-perfect recreation of the vibe and layout.
  4. layout: A precise description of the spatial layout (e.g., "Split 50/50 vertical, dark blue left with white serif text, light gray right with a circular image mask").
  5. description: A short description of what this slide template is best used for.
  6. tags: An array of 3-5 relevant tags for categorizing this template.
  
  IMPORTANT: The 'title', 'keyPoints', 'description', and 'tags' MUST be written in ${language}. The 'imagePrompt' and 'layout' should remain in English for the image generator.`;

  const parts: any[] = [
    { text: prompt },
    { inlineData: { data: pdfFile.data, mimeType: pdfFile.mimeType } }
  ];

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: { parts },
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            imagePrompt: { type: Type.STRING },
            layout: { type: Type.STRING },
            description: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['title', 'keyPoints', 'imagePrompt', 'layout', 'description', 'tags']
        }
      }
    }
  }));

  const text = response.text;
  if (text) return JSON.parse(text);
  return [];
}

export async function generateTemplateMetadata(imageData: string, mimeType: string, language: string = 'English') {
  const ai = getAI();
  const prompt = `You are a presentation design expert. Analyze this slide image and provide metadata for it.
  
  Provide:
  1. title: A concise title for this slide.
  2. description: A short description of what this template is best used for (e.g., "Product showcase", "Data comparison").
  3. tags: An array of 3-5 relevant tags for categorizing this template (e.g., ["marketing", "minimalist", "chart"]).
  
  IMPORTANT: All text MUST be written in ${language}.`;

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3.1-flash-preview', // Using flash for faster response
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { data: imageData.split(',')[1] || imageData, mimeType } }
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['title', 'description', 'tags']
      }
    }
  }));

  const text = response.text;
  if (text) return JSON.parse(text);
  throw new Error("Failed to generate template metadata");
}

export async function analyzeSlideImage(imageData: string, mimeType: string, language: string = 'English') {
  const ai = getAI();
  const prompt = `You are an expert presentation designer and reverse-engineer. Analyze this slide image and extract its exact visual DNA to create a high-fidelity reusable template.
  
  Provide:
  1. title: A concise title for this slide.
  2. keyPoints: An array of 2-4 bullet points summarizing the content.
  3. imagePrompt: A highly detailed, exhaustive visual description for an AI image generator to recreate this exact slide. Include specific details about background colors, typography styles (serif/sans-serif, weight), spatial arrangement, shapes, borders, and any illustrations or photos. The goal is a pixel-perfect recreation of the vibe and layout.
  4. layout: A precise description of the spatial layout (e.g., "Split 50/50 vertical, dark blue left with white serif text, light gray right with a circular image mask").
  5. description: A short description of what this template is best used for (e.g., "Product showcase", "Data comparison").
  6. tags: An array of 3-5 relevant tags for categorizing this template (e.g., ["marketing", "minimalist", "chart"]).
  
  IMPORTANT: The 'title', 'keyPoints', 'description', and 'tags' MUST be written in ${language}. The 'imagePrompt' and 'layout' should remain in English.`;

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { data: imageData.split(',')[1] || imageData, mimeType } }
      ]
    },
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          imagePrompt: { type: Type.STRING },
          layout: { type: Type.STRING },
          description: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['title', 'keyPoints', 'imagePrompt', 'layout', 'description', 'tags']
      }
    }
  }));

  const text = response.text;
  if (text) return JSON.parse(text);
  throw new Error("Failed to analyze slide image");
}

export async function generateSlideImage(globalStyle: string, title: string, keyPoints: string[], layout: string, imagePrompt: string, imageSize: string = '1K') {
  const ai = getAI();
  const fullPrompt = `Create a high-quality, professional presentation slide image.
  Global Style: ${globalStyle}
  Slide Title: ${title}
  Key Points: ${keyPoints.join(', ')}
  Layout Reference: ${layout}
  Specific Visuals: ${imagePrompt}
  
  CRITICAL INSTRUCTIONS:
  - The image MUST look like a complete, beautifully designed presentation slide.
  - Integrate the text (Title and Key Points) seamlessly into the design with excellent typography.
  - Ensure high contrast and readability.
  - Follow the layout and specific visuals exactly to recreate the intended aesthetic.`;

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: fullPrompt,
    config: {
      imageConfig: { 
        aspectRatio: "16:9",
        imageSize: imageSize
      }
    }
  }));

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
}

export async function editSlideImage(base64Image: string, mimeType: string, editPrompt: string) {
  const ai = getAI();
  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image.split(',')[1] || base64Image,
            mimeType: mimeType,
          },
        },
        {
          text: editPrompt,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "1K"
      }
    }
  }));

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No edited image generated");
}

export async function improveText(text: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Improve the following text for a presentation slide. Make it concise, professional, and impactful:\n\n${text}`,
    });
    return response.text;
  } catch (error) {
    console.error('Error improving text:', error);
    throw error;
  }
}

export async function generateChatResponse(message: string, context: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Context about the current presentation:\n${context}\n\nUser: ${message}\nAssistant:`,
    });
    return response.text;
  } catch (error) {
    console.error('Error in chat:', error);
    throw error;
  }
}
