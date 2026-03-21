import React, { useState } from 'react';
import { FileText, Presentation as PresentationIcon, Wand2, Clock, LayoutTemplate, Upload, X, Image as ImageIcon, Trash2, Globe, Maximize, Rocket, Megaphone, Cpu, GraduationCap, Bookmark, Plus, BrainCircuit, Folder, Search, Tag, CheckSquare } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { cn } from '../utils/cn';
import { v4 as uuidv4 } from 'uuid';
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { planImagePresentation, analyzePDFPresentation, analyzeSlideImage, generateTemplateMetadata, SourceFile } from '../services/ai';
import { Slide } from '../types';

// Set worker source for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PendingTemplate {
  id: string;
  title: string;
  description: string;
  tags: string;
  slide: any;
  selected: boolean;
  previewImage: string;
}

export default function Dashboard({ onOpenEditor }: { onOpenEditor: () => void }) {
  const { 
    setPresentation, 
    viewTemplate,
    presentations, 
    loadPresentation, 
    deletePresentation, 
    customTemplates, 
    deleteCustomTemplate, 
    addCustomTemplate,
    templateFolders,
    setIsTemplateView
  } = useEditorStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [sources, setSources] = useState('');
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
  
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [showPDFPrompt, setShowPDFPrompt] = useState(false);
  const [pdfFile, setPdfFile] = useState<SourceFile | null>(null);
  const [learningProgress, setLearningProgress] = useState<{ current: number, total: number } | null>(null);
  const [showLearningChoice, setShowLearningChoice] = useState<{ file: File, type: 'pdf' | 'image' } | null>(null);
  const [dashboardFolderId, setDashboardFolderId] = useState<string>('all');
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateTags, setTemplateTags] = useState('');
  const [pendingTemplates, setPendingTemplates] = useState<PendingTemplate[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  
  const [showMoveTemplateModal, setShowMoveTemplateModal] = useState(false);
  const [movingTemplateId, setMovingTemplateId] = useState<string | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string>('all');
  
  const [slideCount, setSlideCount] = useState(5);
  const [globalStyle, setGlobalStyle] = useState('Modern, minimalist, corporate, clean lines, professional');
  const [language, setLanguage] = useState('English');
  const [imageSize, setImageSize] = useState('1K');

  const LANGUAGES = ['English', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Spanish', 'French', 'German', 'Japanese', 'Korean'];
  const IMAGE_SIZES = ['1K', '2K', '4K'];

  const PREDEFINED_STYLES = [
    'Modern, minimalist, corporate, clean lines, professional',
    'Cyberpunk, dark mode, neon accents, technical, blueprint',
    'Vibrant, energetic, bold typography, pop art influences',
    'Clean, academic, accessible, watercolor illustrations, soft colors',
    'Vintage, retro 80s, synthwave, glowing grids',
    'Elegant, luxury, serif fonts, gold and black, high-end',
    'Playful, cartoonish, bright colors, rounded shapes, friendly',
    'Nature-inspired, earthy tones, organic shapes, eco-friendly'
  ];

  const TEMPLATES = [
    {
      id: 'startup-pitch',
      title: 'Startup Pitch Deck',
      description: 'A clean, persuasive deck for investors.',
      topic: 'Startup Pitch Deck for a new AI product',
      style: 'Modern, minimalist, corporate, clean lines, professional',
      icon: Rocket,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'marketing-plan',
      title: 'Marketing Campaign',
      description: 'Bold and energetic visuals for marketing.',
      topic: 'Q3 Marketing Campaign Strategy',
      style: 'Vibrant, energetic, bold typography, pop art influences',
      icon: Megaphone,
      color: 'bg-pink-100 text-pink-600'
    },
    {
      id: 'tech-architecture',
      title: 'Tech Architecture',
      description: 'Dark mode, technical diagrams and flows.',
      topic: 'System Architecture and Technical Review',
      style: 'Cyberpunk, dark mode, neon accents, technical, blueprint',
      icon: Cpu,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: 'education-course',
      title: 'Educational Course',
      description: 'Clear, accessible, and engaging lessons.',
      topic: 'Introduction to Machine Learning',
      style: 'Clean, academic, accessible, watercolor illustrations, soft colors',
      icon: GraduationCap,
      color: 'bg-green-100 text-green-600'
    }
  ];

  const handleOpenPresentation = (id: string) => {
    loadPresentation(id);
    onOpenEditor();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = (e.target?.result as string).split(',')[1];
          setSourceFiles(prev => [...prev, { name: file.name, mimeType: file.type, data: base64 }]);
        };
        reader.readAsDataURL(file);
      } else {
        const text = await file.text();
        setSourceFiles(prev => [...prev, { name: file.name, mimeType: 'text/plain', data: text }]);
      }
    }
  };

  const handlePDFUploadForRecreate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      setPdfFile({ name: file.name, mimeType: file.type, data: base64 });
      setShowPDFPrompt(true);
    };
    reader.readAsDataURL(file);
  };

  const removeSourceFile = (index: number) => {
    setSourceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const checkApiKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && aistudio.hasSelectedApiKey) {
      const hasKey = await aistudio.hasSelectedApiKey();
      if (!hasKey) {
        try {
          await aistudio.openSelectKey();
          return true;
        } catch (e) {
          console.error(e);
          console.log("A valid API Key is required for high-quality image generation.");
          return false;
        }
      }
    }
    return true;
  };

  const handleGenerateImagePPT = async () => {
    if (!topic) return;
    if (!(await checkApiKey())) return;

    setIsGenerating(true);
    try {
      const plans = await planImagePresentation(topic, sources, sourceFiles, slideCount, globalStyle, language);
      
      const newSlides = plans.map((plan: any) => ({
        id: uuidv4(),
        elements: [],
        background: '#ffffff',
        title: plan.title,
        keyPoints: plan.keyPoints,
        imagePrompt: plan.imagePrompt,
        layout: plan.layout,
        status: 'pending'
      }));

      setPresentation({
        id: uuidv4(),
        title: topic,
        slides: newSlides,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isImagePPT: true,
        globalStyle,
        language,
        imageSize
      });
      
      onOpenEditor();

      if (newSlides.length > 0) {
        useEditorStore.getState().generateImageForSlide(newSlides[0].id);
      }

    } catch (error) {
      console.error('Failed to plan image presentation:', error);
      console.log('Failed to plan presentation. Please try again.');
    } finally {
      setIsGenerating(false);
      setShowImagePrompt(false);
    }
  };

  const handleRecreateFromPDF = async () => {
    if (!pdfFile) return;
    if (!(await checkApiKey())) return;

    setIsGenerating(true);
    try {
      let plans: any[] = [];
      try {
        plans = await analyzePDFPresentation(pdfFile, globalStyle, language);
      } catch (error) {
        console.warn("Failed to analyze whole PDF, falling back to page-by-page analysis", error);
      }

      if (!plans || plans.length === 0) {
        // Fallback: decode base64 to ArrayBuffer and use pdfjs
        const binaryString = atob(pdfFile.data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const loadingTask = pdfjs.getDocument({ data: bytes.buffer });
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;
        
        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
            await page.render({ canvasContext: context, viewport, canvas }).promise;
            const base64 = canvas.toDataURL('image/png');
            
            try {
              const analysis = await analyzeSlideImage(base64, 'image/png', language);
              plans.push(analysis);
            } catch (e) {
              console.error(`Failed to analyze page ${i}`, e);
              plans.push({
                title: `Page ${i}`,
                keyPoints: [],
                imagePrompt: '',
                layout: '',
                description: '',
                tags: []
              });
            }
          }
        }
      }
      
      const newSlides: Slide[] = plans.map((plan: any) => ({
        id: uuidv4(),
        elements: [],
        background: '#ffffff',
        title: plan.title,
        keyPoints: plan.keyPoints,
        imagePrompt: plan.imagePrompt,
        layout: plan.layout,
        status: 'pending'
      }));

      setPresentation({
        id: uuidv4(),
        title: `Recreated: ${pdfFile.name}`,
        slides: newSlides,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isImagePPT: true,
        globalStyle,
        language,
        imageSize
      });
      
      onOpenEditor();

      if (newSlides.length > 0) {
        useEditorStore.getState().generateImageForSlide(newSlides[0].id);
      }

    } catch (error) {
      console.error('Failed to analyze PDF:', error);
      console.log('Failed to analyze PDF. Please try again.');
    } finally {
      setIsGenerating(false);
      setShowPDFPrompt(false);
      setPdfFile(null);
    }
  };

  const handleUseTemplate = (template: typeof TEMPLATES[0]) => {
    setTopic(template.topic);
    setGlobalStyle(template.style);
    setSlideCount(5);
    setShowImagePrompt(true);
  };

  const handleCreateTemplateFromAsset = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      setShowLearningChoice({ file, type: 'pdf' });
    } else if (file.type.startsWith('image/')) {
      setShowLearningChoice({ file, type: 'image' });
    }
    // Reset input
    e.target.value = '';
  };

  const processQuickTemplate = async (file: File) => {
    setShowLearningChoice(null);
    if (file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;
        setLearningProgress({ current: 0, total: totalPages });
        const newPending: PendingTemplate[] = [];
        
        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
            await page.render({ canvasContext: context, viewport, canvas }).promise;
            const base64 = canvas.toDataURL('image/png');
            
            let metadata = { title: `${file.name.split('.')[0]} - Page ${i}`, description: '', tags: [] as string[] };
            try {
              metadata = await generateTemplateMetadata(base64, 'image/png', language);
            } catch (e) {
              console.error('Failed to generate metadata for page', i, e);
            }
            
            const newSlide = {
              id: uuidv4(),
              background: '#ffffff',
              elements: [
                {
                  id: uuidv4(),
                  type: 'image' as const,
                  x: 0,
                  y: 0,
                  width: 960,
                  height: 540,
                  content: base64
                }
              ]
            };
            
            newPending.push({
              id: uuidv4(),
              title: metadata.title || `${file.name.split('.')[0]} - Page ${i}`,
              description: templateDescription || metadata.description || '',
              tags: templateTags || (metadata.tags ? metadata.tags.join(', ') : ''),
              slide: newSlide,
              selected: true,
              previewImage: base64
            });
            setLearningProgress(prev => prev ? { ...prev, current: i } : null);
          }
        }
        setPendingTemplates(newPending);
        setShowReviewModal(true);
        setLearningProgress(null);
      } catch (error) {
        console.error('Error processing PDF for template:', error);
        console.log('Failed to process PDF. Please try again.');
        setLearningProgress(null);
      }
    } else {
      setLearningProgress({ current: 0, total: 1 });
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        let metadata = { title: file.name.split('.')[0], description: '', tags: [] as string[] };
        try {
          metadata = await generateTemplateMetadata(base64, file.type, language);
        } catch (e) {
          console.error('Failed to generate metadata for image', e);
        }
        
        const newSlide = {
          id: uuidv4(),
          background: '#ffffff',
          elements: [
            {
              id: uuidv4(),
              type: 'image' as const,
              x: 0,
              y: 0,
              width: 960,
              height: 540,
              content: base64
            }
          ]
        };
        const newPending: PendingTemplate[] = [{
          id: uuidv4(),
          title: metadata.title || file.name.split('.')[0],
          description: templateDescription || metadata.description || '',
          tags: templateTags || (metadata.tags ? metadata.tags.join(', ') : ''),
          slide: newSlide,
          selected: true,
          previewImage: base64
        }];
        setPendingTemplates(newPending);
        setShowReviewModal(true);
        setLearningProgress(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const processLearnAsset = async (file: File) => {
    setShowLearningChoice(null);
    if (!(await checkApiKey())) return;

    setLearningProgress({ current: 0, total: 1 });
    
    try {
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        
        // Convert file to base64 for analyzePDFPresentation
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        const sourceFile: SourceFile = {
          name: file.name,
          data: base64Data,
          mimeType: file.type || 'application/pdf'
        };

        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;
        
        setLearningProgress({ current: 0, total: totalPages });
        
        let plans: any[] = [];
        try {
          // Analyze the whole PDF at once
          plans = await analyzePDFPresentation(sourceFile, globalStyle, language);
        } catch (error) {
          console.warn("Failed to analyze whole PDF, falling back to page-by-page analysis", error);
        }
        
        const newPending: PendingTemplate[] = [];

        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
            await page.render({ canvasContext: context, viewport, canvas }).promise;
            const base64 = canvas.toDataURL('image/png');
            
            let analysis = plans[i - 1];
            
            if (!analysis) {
              try {
                // Fallback: analyze this specific page image
                analysis = await analyzeSlideImage(base64, 'image/png', language);
              } catch (e) {
                console.error(`Failed to analyze page ${i}`, e);
                analysis = {
                  title: `Page ${i}`,
                  keyPoints: [],
                  imagePrompt: '',
                  layout: '',
                  description: '',
                  tags: []
                };
              }
            }
            
            const markdownPrompt = `Create a presentation slide image.
  Global Style: ${globalStyle}
  Slide Title: ${analysis.title}
  Key Points: ${(analysis.keyPoints || []).join(', ')}
  Layout Reference: ${analysis.layout}
  Specific Visuals: ${analysis.imagePrompt}
  Ensure the image looks like a complete, beautifully designed presentation slide with the text integrated into the design.`;

            const newSlide = {
              id: uuidv4(),
              background: '#ffffff',
              title: analysis.title,
              keyPoints: analysis.keyPoints,
              imagePrompt: analysis.imagePrompt,
              layout: analysis.layout,
              elements: [
                {
                  id: uuidv4(),
                  type: 'image' as const,
                  x: 40,
                  y: 40,
                  width: 420,
                  height: 460,
                  content: base64
                },
                {
                  id: uuidv4(),
                  type: 'text' as const,
                  x: 500,
                  y: 40,
                  width: 420,
                  height: 460,
                  content: markdownPrompt,
                  style: { fontSize: '14px', color: '#333333', textAlign: 'left' }
                }
              ]
            };
            
            newPending.push({
              id: uuidv4(),
              title: analysis.title || `${file.name.split('.')[0]} - Page ${i}`,
              description: templateDescription || analysis.description || '',
              tags: templateTags || (analysis.tags ? analysis.tags.join(', ') : ''),
              slide: newSlide,
              selected: true,
              previewImage: base64
            });
            setLearningProgress(prev => prev ? { ...prev, current: i } : null);
          }
        }
        setPendingTemplates(newPending);
        setShowReviewModal(true);
      } else {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = event.target?.result as string;
          const analysis = await analyzeSlideImage(base64, file.type, language);
          
          const markdownPrompt = `Create a presentation slide image.
  Global Style: ${globalStyle}
  Slide Title: ${analysis.title}
  Key Points: ${(analysis.keyPoints || []).join(', ')}
  Layout Reference: ${analysis.layout}
  Specific Visuals: ${analysis.imagePrompt}
  Ensure the image looks like a complete, beautifully designed presentation slide with the text integrated into the design.`;

          const newSlide = {
            id: uuidv4(),
            background: '#ffffff',
            title: analysis.title,
            keyPoints: analysis.keyPoints,
            imagePrompt: analysis.imagePrompt,
            layout: analysis.layout,
            elements: [
              {
                id: uuidv4(),
                type: 'image' as const,
                x: 40,
                y: 40,
                width: 420,
                height: 460,
                content: base64
              },
              {
                id: uuidv4(),
                type: 'text' as const,
                x: 500,
                y: 40,
                width: 420,
                height: 460,
                content: markdownPrompt,
                style: { fontSize: '14px', color: '#333333', textAlign: 'left' }
              }
            ]
          };
          
          const newPending: PendingTemplate[] = [{
            id: uuidv4(),
            title: analysis.title || `${file.name.split('.')[0]} (Learned)`,
            description: templateDescription || analysis.description || '',
            tags: templateTags || (analysis.tags ? analysis.tags.join(', ') : ''),
            slide: newSlide,
            selected: true,
            previewImage: base64
          }];
          setPendingTemplates(newPending);
          setShowReviewModal(true);
          setLearningProgress(null);
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Error learning from asset:', error);
      console.log('Failed to learn from asset. Please try again.');
    } finally {
      if (file.type === 'application/pdf') {
        setLearningProgress(null);
      }
    }
  };

  const renderFileUpload = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-600 font-medium">Upload Files (PDF, TXT, MD):</p>
        <label className="cursor-pointer text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1">
          <Upload className="w-4 h-4" />
          Add File
          <input type="file" multiple accept=".pdf,.txt,.md" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>
      
      {sourceFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {sourceFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-sm">
              <FileText className="w-4 h-4" />
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button onClick={() => removeSourceFile(index)} className="hover:text-indigo-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <PresentationIcon className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-xl text-gray-900">AI Slide Studio</span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <a href="#recent" className="flex items-center gap-3 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-md font-medium">
            <Clock className="w-5 h-5" />
            Recent
          </a>
          <a href="#templates" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-md font-medium">
            <LayoutTemplate className="w-5 h-5" />
            Template Library
          </a>
          
          <div className="pt-6 pb-2">
            <div className="flex items-center gap-3 px-3 text-gray-900 font-medium">
              <FileText className="w-5 h-5 text-gray-500" />
              My Presentations
            </div>
          </div>
          <div className="space-y-1 mt-1">
            {presentations.map(p => (
              <button 
                key={p.id}
                onClick={() => handleOpenPresentation(p.id)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-indigo-600 rounded-md font-medium text-left transition-colors group pl-11"
              >
                <span className="truncate">{p.title}</span>
              </button>
            ))}
            {presentations.length === 0 && (
              <div className="px-11 py-2 text-sm text-gray-400 italic">
                No projects yet
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto scroll-smooth">
        <div className="p-8 max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Start a new presentation</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <button 
              onClick={() => setShowImagePrompt(true)}
              className="flex flex-col items-center justify-center h-48 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl hover:shadow-lg transition-all transform hover:-translate-y-1 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <span className="font-medium text-white">Nano-Based PPT</span>
              <span className="text-sm text-indigo-100 mt-1">High-quality visuals</span>
            </button>

            <label className="flex flex-col items-center justify-center h-48 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow group cursor-pointer">
              <input type="file" accept=".pdf" className="hidden" onChange={handlePDFUploadForRecreate} />
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
                <LayoutTemplate className="w-6 h-6" />
              </div>
              <span className="font-medium text-gray-900">Recreate from PDF</span>
              <span className="text-sm text-gray-500 mt-1">Convert file to slides</span>
            </label>
          </div>

          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">System Presets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {TEMPLATES.map(template => {
                const Icon = template.icon;
                return (
                  <div 
                    key={template.id}
                    onClick={() => handleUseTemplate(template)}
                    className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${template.color} group-hover:scale-110 transition-transform shadow-sm`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{template.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{template.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Template Library Section */}
          <div id="templates" className="mb-12 pt-8 border-t border-gray-200">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Template Library</h2>
                  <p className="text-sm text-gray-500 mt-1">Start with a preset or use your saved designs</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={dashboardSearchQuery}
                      onChange={(e) => setDashboardSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                    />
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium cursor-pointer hover:bg-indigo-700 transition-all shadow-sm shrink-0">
                    <Plus className="w-4 h-4" />
                    Learn from Asset
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleCreateTemplateFromAsset} />
                  </label>
                </div>
              </div>

              {/* Folder Navigation */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setDashboardFolderId('all')}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                    dashboardFolderId === 'all' ? "bg-indigo-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setDashboardFolderId('my-templates')}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                    dashboardFolderId === 'my-templates' ? "bg-indigo-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  )}
                >
                  My Templates
                </button>
                <div className="w-px h-6 bg-gray-200 mx-1 shrink-0" />
                {templateFolders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setDashboardFolderId(folder.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                      dashboardFolderId === folder.id ? "bg-indigo-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                    )}
                  >
                    {folder.name}
                  </button>
                ))}
                <button
                  onClick={() => setShowFolderModal(true)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 flex items-center gap-1"
                >
                  <Folder className="w-4 h-4" />
                  Manage Folders
                </button>
              </div>

              {/* Unified Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Custom Templates */}
                {(dashboardFolderId === 'all' || dashboardFolderId === 'my-templates' || templateFolders.some(f => f.id === dashboardFolderId)) && 
                  customTemplates.filter(t => {
                    const matchesSearch = t.name.toLowerCase().includes(dashboardSearchQuery.toLowerCase()) || 
                                        t.description?.toLowerCase().includes(dashboardSearchQuery.toLowerCase()) ||
                                        t.tags?.some(tag => tag.toLowerCase().includes(dashboardSearchQuery.toLowerCase()));
                    const matchesFolder = dashboardFolderId === 'all' || 
                                        dashboardFolderId === 'my-templates' || 
                                        t.folderId === dashboardFolderId;
                    return matchesSearch && matchesFolder;
                  }).map(template => (
                    <div 
                      key={template.id}
                      onClick={() => {
                        const newPresentation = {
                          id: uuidv4(),
                          title: `New from ${template.name}`,
                          slides: [{
                            ...template.slide,
                            id: uuidv4(),
                            elements: template.slide.elements.map(e => ({ ...e, id: uuidv4() }))
                          }],
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString()
                        };
                        viewTemplate(newPresentation);
                        onOpenEditor();
                      }}
                      className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer group relative flex flex-col"
                    >
                      <div className="aspect-video bg-gray-50 relative flex items-center justify-center">
                        {template.slide.imageUrl ? (
                          <img src={template.slide.imageUrl} alt={template.name} className="w-full h-full object-cover" />
                        ) : template.slide.elements.find(e => e.type === 'image') ? (
                          <img 
                            src={template.slide.elements.find(e => e.type === 'image')?.content} 
                            alt={template.name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                            <Bookmark className="w-12 h-12 opacity-20" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 flex gap-1 z-10">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 px-2 py-1 rounded-full shadow-sm">Custom</span>
                          <button
                            type="button"
                            onClickCapture={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setMovingTemplateId(template.id);
                              setTargetFolderId(template.folderId || 'all');
                              setShowMoveTemplateModal(true);
                            }}
                            className="p-1.5 bg-white/90 backdrop-blur-sm text-indigo-600 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-50 cursor-pointer relative z-20"
                            title="Move to folder"
                          >
                            <Folder className="w-4 h-4 pointer-events-none" />
                          </button>
                          <button
                            type="button"
                            onClickCapture={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteCustomTemplate(template.id);
                            }}
                            className="p-1.5 bg-white/90 backdrop-blur-sm text-red-500 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 cursor-pointer relative z-20"
                            title="Delete template"
                          >
                            <Trash2 className="w-4 h-4 pointer-events-none" />
                          </button>
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-gray-900 truncate mb-1">{template.name}</h3>
                        {template.description && (
                          <p className="text-xs text-gray-500 line-clamp-2 mb-2 flex-1">{template.description}</p>
                        )}
                        {template.tags && template.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-auto">
                            {template.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-medium">
                                <Tag className="w-2 h-2" />
                                {tag}
                              </span>
                            ))}
                            {template.tags.length > 3 && (
                              <span className="text-[9px] text-gray-400 font-medium">+{template.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                }
              </div>

              {/* Empty State */}
              {((dashboardFolderId === 'all' || dashboardFolderId === 'my-templates' || templateFolders.some(f => f.id === dashboardFolderId)) && 
                customTemplates.filter(t => {
                  const matchesSearch = t.name.toLowerCase().includes(dashboardSearchQuery.toLowerCase()) || 
                                      t.description?.toLowerCase().includes(dashboardSearchQuery.toLowerCase()) ||
                                      t.tags?.some(tag => tag.toLowerCase().includes(dashboardSearchQuery.toLowerCase()));
                  const matchesFolder = dashboardFolderId === 'all' || 
                                      dashboardFolderId === 'my-templates' || 
                                      t.folderId === dashboardFolderId;
                  return matchesSearch && matchesFolder;
                }).length === 0 && 
                dashboardFolderId !== 'system' && 
                dashboardFolderId !== 'all') && (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500 shadow-sm">
                  <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <p className="text-sm">No templates found in this folder.</p>
                </div>
              )}
            </div>
          </div>

          {/* PDF Recreate Prompt Modal */}
          {showPDFPrompt && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <LayoutTemplate className="w-6 h-6 text-orange-600" />
                  Recreate from PDF
                </h2>
                
                <div className="space-y-4 mb-6">
                  <div className="bg-orange-50 text-orange-800 p-3 rounded-lg text-sm">
                    <strong>Selected File:</strong> {pdfFile?.name}
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Target Global Style</label>
                    <input
                      type="text"
                      list="style-options"
                      value={globalStyle}
                      onChange={(e) => setGlobalStyle(e.target.value)}
                      placeholder="e.g., Cyberpunk, Minimalist, Watercolor..."
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <datalist id="style-options">
                      {PREDEFINED_STYLES.map((style, index) => (
                        <option key={index} value={style} />
                      ))}
                    </datalist>
                    <p className="text-xs text-gray-500 mt-1">
                      Gemini 3.1 Pro will analyze the PDF page by page and extract the content to recreate it in this unified style using Nano Banana Pro.
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-gray-700 font-medium mb-1 flex items-center gap-1">
                        <Globe className="w-4 h-4" /> Language
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        {LANGUAGES.map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-gray-700 font-medium mb-1 flex items-center gap-1">
                        <Maximize className="w-4 h-4" /> Image Size
                      </label>
                      <select
                        value={imageSize}
                        onChange={(e) => setImageSize(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        {IMAGE_SIZES.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => {
                      setShowPDFPrompt(false);
                      setPdfFile(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleRecreateFromPDF}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Analyzing PDF...</>
                    ) : 'Analyze & Recreate'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Image PPT Prompt Modal */}
          {showImagePrompt && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <ImageIcon className="w-6 h-6 text-indigo-600" />
                  Generate Nano-Based Presentation
                </h2>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Topic</label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., The Future of Renewable Energy"
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Global Design Style</label>
                    <input
                      type="text"
                      list="style-options-ppt"
                      value={globalStyle}
                      onChange={(e) => setGlobalStyle(e.target.value)}
                      placeholder="e.g., Cyberpunk, Minimalist, Watercolor..."
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <datalist id="style-options-ppt">
                      {PREDEFINED_STYLES.map((style, index) => (
                        <option key={index} value={style} />
                      ))}
                    </datalist>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-gray-700 font-medium mb-1">Number of Slides</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={slideCount}
                        onChange={(e) => setSlideCount(parseInt(e.target.value) || 5)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-gray-700 font-medium mb-1 flex items-center gap-1">
                        <Globe className="w-4 h-4" /> Language
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        {LANGUAGES.map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-gray-700 font-medium mb-1 flex items-center gap-1">
                        <Maximize className="w-4 h-4" /> Image Size
                      </label>
                      <select
                        value={imageSize}
                        onChange={(e) => setImageSize(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        {IMAGE_SIZES.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Sources (Text/Notes)</label>
                    <textarea
                      value={sources}
                      onChange={(e) => setSources(e.target.value)}
                      placeholder="Paste text to ground the generation..."
                      className="w-full h-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
                    />
                  </div>

                  {renderFileUpload()}
                </div>

                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setShowImagePrompt(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleGenerateImagePPT}
                    disabled={!topic || isGenerating}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Planning...</>
                    ) : 'Plan & Generate'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Learning Choice Modal */}
          {showLearningChoice && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <BrainCircuit className="w-6 h-6 text-indigo-600" />
                  Process Asset
                </h2>
                <p className="text-gray-600 mb-6">
                  How would you like to process <strong>{showLearningChoice.file.name}</strong>?
                </p>

                <div className="mb-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Folder className="w-4 h-4" /> Save to Folder (Optional)
                    </label>
                    <select
                      value={selectedFolderId}
                      onChange={(e) => setSelectedFolderId(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="">Uncategorized</option>
                      {templateFolders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                    <textarea
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm h-16 resize-none"
                      placeholder="What is this template for?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags (Comma separated)</label>
                    <input
                      type="text"
                      value={templateTags}
                      onChange={(e) => setTemplateTags(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="e.g., Marketing, Minimalist, AI"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => processQuickTemplate(showLearningChoice.file)}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all text-left group"
                  >
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <LayoutTemplate className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Quick Template</div>
                      <div className="text-xs text-gray-500">Save first page/image as a visual template</div>
                    </div>
                  </button>
                  <button 
                    onClick={() => processLearnAsset(showLearningChoice.file)}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:bg-purple-50 hover:border-purple-200 transition-all text-left group"
                  >
                    <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BrainCircuit className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">AI Learning (Page by Page)</div>
                      <div className="text-xs text-gray-500">Analyze each page and save as reusable AI prompts</div>
                    </div>
                  </button>
                </div>
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={() => setShowLearningChoice(null)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Review Templates Modal */}
          {showReviewModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <CheckSquare className="w-6 h-6 text-indigo-600" />
                  Review Templates
                </h2>
                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                  {pendingTemplates.map((pt, index) => (
                    <div key={pt.id} className={`flex gap-4 p-4 border rounded-xl transition-colors ${pt.selected ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                      <div className="pt-1">
                        <input 
                          type="checkbox" 
                          checked={pt.selected}
                          onChange={(e) => {
                            const newPending = [...pendingTemplates];
                            newPending[index].selected = e.target.checked;
                            setPendingTemplates(newPending);
                          }}
                          className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                      </div>
                      <div className="w-48 h-27 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={pt.previewImage} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                          <input 
                            type="text" 
                            value={pt.title}
                            onChange={(e) => {
                              const newPending = [...pendingTemplates];
                              newPending[index].title = e.target.value;
                              setPendingTemplates(newPending);
                            }}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                          <input 
                            type="text" 
                            value={pt.description}
                            onChange={(e) => {
                              const newPending = [...pendingTemplates];
                              newPending[index].description = e.target.value;
                              setPendingTemplates(newPending);
                            }}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Tags (Comma separated)</label>
                          <input 
                            type="text" 
                            value={pt.tags}
                            onChange={(e) => {
                              const newPending = [...pendingTemplates];
                              newPending[index].tags = e.target.value;
                              setPendingTemplates(newPending);
                            }}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
                  <button 
                    onClick={() => {
                      setShowReviewModal(false);
                      setPendingTemplates([]);
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      const selectedFolder = selectedFolderId || undefined;
                      pendingTemplates.filter(pt => pt.selected).forEach(pt => {
                        const tagsArray = pt.tags.split(',').map(t => t.trim()).filter(t => t !== '');
                        addCustomTemplate(pt.title, pt.slide, selectedFolder, pt.description, tagsArray);
                      });
                      setShowReviewModal(false);
                      setPendingTemplates([]);
                      console.log('Templates saved successfully!');
                    }}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Save Selected ({pendingTemplates.filter(pt => pt.selected).length})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Learning Progress Modal */}
          {learningProgress && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
              <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BrainCircuit className="w-8 h-8 animate-pulse" />
                </div>
                <h2 className="text-xl font-bold mb-2">Learning from Asset...</h2>
                <p className="text-gray-500 text-sm mb-6">
                  Analyzing page {learningProgress.current} of {learningProgress.total}. 
                  This may take a moment as we extract design patterns.
                </p>
                <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                  <div 
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${(learningProgress.current / learningProgress.total) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-400 font-medium">
                  {Math.round((learningProgress.current / learningProgress.total) * 100)}% Complete
                </div>
              </div>
            </div>
          )}

          {/* Recent Presentations Section */}
          <div id="recent" className="pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Presentations</h2>
            {presentations.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-8 text-center text-gray-500">
                  No recent presentations found. Create one to get started!
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {presentations.map((p) => (
                  <div 
                    key={p.id} 
                    onClick={() => handleOpenPresentation(p.id)}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer group relative"
                  >
                    <div className="aspect-video bg-gray-100 relative">
                      {p.isImagePPT && p.slides[0]?.imageUrl ? (
                        <img src={p.slides[0].imageUrl} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 group-hover:scale-105 transition-transform">
                          <PresentationIcon className="w-12 h-12 opacity-20" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 truncate pr-6">{p.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Edited {new Date(p.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePresentation(p.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm text-red-500 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                      title="Delete Presentation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Folder Management Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Folder className="w-5 h-5 text-indigo-600" />
                Manage Folders
              </h2>
              <button onClick={() => {
                setShowFolderModal(false);
                setEditingFolderId(null);
                setNewFolderName('');
              }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  placeholder="New folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newFolderName.trim()) {
                      if (editingFolderId) {
                        useEditorStore.getState().updateTemplateFolder(editingFolderId, newFolderName.trim());
                        setEditingFolderId(null);
                      } else {
                        useEditorStore.getState().addTemplateFolder(newFolderName.trim());
                      }
                      setNewFolderName('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newFolderName.trim()) {
                      if (editingFolderId) {
                        useEditorStore.getState().updateTemplateFolder(editingFolderId, newFolderName.trim());
                        setEditingFolderId(null);
                      } else {
                        useEditorStore.getState().addTemplateFolder(newFolderName.trim());
                      }
                      setNewFolderName('');
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  {editingFolderId ? 'Update' : 'Add'}
                </button>
              </div>

              <div className="space-y-2">
                {templateFolders.map(folder => (
                  <div key={folder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                    <span className="font-medium text-gray-700">{folder.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingFolderId(folder.id);
                          setNewFolderName(folder.name);
                        }}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => useEditorStore.getState().deleteTemplateFolder(folder.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {templateFolders.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No folders yet. Create one above!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move Template Modal */}
      {showMoveTemplateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Move Template</h2>
              <button onClick={() => setShowMoveTemplateModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
                <button
                  onClick={() => setTargetFolderId('all')}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-between",
                    targetFolderId === 'all' ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <span>No Folder (All)</span>
                  {targetFolderId === 'all' && <CheckSquare className="w-4 h-4" />}
                </button>
                {templateFolders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setTargetFolderId(folder.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-between",
                      targetFolderId === folder.id ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <span>{folder.name}</span>
                    {targetFolderId === folder.id && <CheckSquare className="w-4 h-4" />}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMoveTemplateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (movingTemplateId) {
                      useEditorStore.getState().updateCustomTemplate(movingTemplateId, { 
                        folderId: targetFolderId === 'all' ? undefined : targetFolderId 
                      });
                    }
                    setShowMoveTemplateModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  Move
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
