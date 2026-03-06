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
  const prompt = `You are an expert presentation analyzer. I have provided a PDF of a presentation. Please analyze it page by page. For each page, extract the core message and visual elements, and convert them into a format suitable for an AI image generator to recreate the slide with a unified style.
  Global Style: ${style}
  
  For each slide in the PDF, provide:
  1. title: The slide title.
  2. keyPoints: An array of 2-4 short bullet points summarizing the text.
  3. imagePrompt: A detailed visual description for an AI image generator to recreate the layout and visual elements of this slide, incorporating the global style.
  4. layout: A brief description of the layout.
  
  IMPORTANT: The 'title' and 'keyPoints' MUST be written in ${language}. The 'imagePrompt' and 'layout' should remain in English for the image generator.`;

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

export async function generateSlideImage(globalStyle: string, title: string, keyPoints: string[], layout: string, imagePrompt: string, imageSize: string = '1K') {
  const ai = getAI();
  const fullPrompt = `Create a presentation slide image.
  Global Style: ${globalStyle}
  Slide Title: ${title}
  Key Points: ${keyPoints.join(', ')}
  Layout Reference: ${layout}
  Specific Visuals: ${imagePrompt}
  Ensure the image looks like a complete, beautifully designed presentation slide with the text integrated into the design.`;

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
