import React, { useState } from 'react';
import { Plus, FileText, Presentation as PresentationIcon, Wand2, Clock, LayoutTemplate, Upload, X, Image as ImageIcon, Trash2, Globe, Maximize, Rocket, Megaphone, Cpu, GraduationCap } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { v4 as uuidv4 } from 'uuid';
import { planImagePresentation, analyzePDFPresentation, SourceFile } from '../services/ai';

export default function Dashboard({ onOpenEditor }: { onOpenEditor: () => void }) {
  const { setPresentation, presentations, loadPresentation, deletePresentation } = useEditorStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [sources, setSources] = useState('');
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
  
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [showPDFPrompt, setShowPDFPrompt] = useState(false);
  const [pdfFile, setPdfFile] = useState<SourceFile | null>(null);
  
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

  const handleCreateBlank = () => {
    setPresentation({
      id: uuidv4(),
      title: 'Untitled Presentation',
      slides: [{ id: uuidv4(), elements: [], background: '#ffffff' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    onOpenEditor();
  };

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
          alert("A valid API Key is required for high-quality image generation.");
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
      alert('Failed to plan presentation. Please try again.');
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
      const plans = await analyzePDFPresentation(pdfFile, globalStyle, language);
      
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
      alert('Failed to analyze PDF. Please try again.');
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
            Templates
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <button 
              onClick={handleCreateBlank}
              className="flex flex-col items-center justify-center h-48 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-colors group"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-medium text-gray-900">Blank Presentation</span>
            </button>

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
              <span className="font-medium text-gray-900">Upload PDF</span>
              <span className="text-sm text-gray-500 mt-1">Recreate Presentation</span>
            </label>
          </div>

          {/* Templates Section */}
          <div id="templates" className="mb-12 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Start from a Template</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {TEMPLATES.map(template => {
                const Icon = template.icon;
                return (
                  <div 
                    key={template.id}
                    onClick={() => handleUseTemplate(template)}
                    className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${template.color} group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{template.title}</h3>
                    <p className="text-sm text-gray-500">{template.description}</p>
                  </div>
                );
              })}
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

          <div id="recent" className="pt-8">
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
                        if (confirm('Are you sure you want to delete this presentation?')) {
                          deletePresentation(p.id);
                        }
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
    </div>
  );
}
