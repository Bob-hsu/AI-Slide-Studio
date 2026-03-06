import React from 'react';
import Topbar from '../components/Topbar';
import SlideList from '../components/SlideList';
import SlideCanvas from '../components/SlideCanvas';
import AIAssistant from '../components/AIAssistant';
import ImageSlideSettings from '../components/ImageSlideSettings';
import { useEditorStore } from '../store/useEditorStore';

export default function Editor({ onBack }: { onBack: () => void }) {
  const isImagePPT = useEditorStore(state => state.presentation?.isImagePPT);

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Topbar onBack={onBack} />
      <div className="flex flex-1 overflow-hidden">
        <SlideList />
        <SlideCanvas />
        {isImagePPT ? <ImageSlideSettings /> : <AIAssistant />}
      </div>
    </div>
  );
}
