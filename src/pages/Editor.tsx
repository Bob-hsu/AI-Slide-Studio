import React from 'react';
import Topbar from '../components/Topbar';
import SlideList from '../components/SlideList';
import SlideCanvas from '../components/SlideCanvas';
import AIAssistant from '../components/AIAssistant';
import ImageSlideSettings from '../components/ImageSlideSettings';
import { useEditorStore } from '../store/useEditorStore';
import { ArrowLeft, Edit2 } from 'lucide-react';

export default function Editor({ onBack }: { onBack: () => void }) {
  const isImagePPT = useEditorStore(state => state.presentation?.isImagePPT);
  const isTemplateView = useEditorStore(state => state.isTemplateView);
  const setIsTemplateView = useEditorStore(state => state.setIsTemplateView);
  const presentation = useEditorStore(state => state.presentation);

  const handleBack = () => {
    if (isTemplateView) {
      setIsTemplateView(false);
    }
    onBack();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {isTemplateView ? (
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="font-semibold text-gray-900">{presentation?.title || 'Template View'}</h1>
          </div>
        </div>
      ) : (
        <Topbar onBack={handleBack} />
      )}
      <div className="flex flex-1 overflow-hidden relative">
        {!isTemplateView && <SlideList />}
        <SlideCanvas />
        {!isTemplateView && (isImagePPT ? <ImageSlideSettings /> : <AIAssistant />)}
      </div>
    </div>
  );
}
