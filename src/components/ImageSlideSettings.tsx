import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Wand2, Image as ImageIcon } from 'lucide-react';

export default function ImageSlideSettings() {
  const { presentation, activeSlideId, updateSlide, generateImageForSlide } = useEditorStore();
  const activeSlide = presentation?.slides.find(s => s.id === activeSlideId);

  if (!presentation?.isImagePPT || !activeSlide) return null;

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full shadow-lg z-10 overflow-y-auto">
      <div className="p-4 border-b border-gray-200 bg-indigo-50/50">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-indigo-600" />
          Slide Image Settings
        </h2>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={activeSlide.title || ''}
            onChange={(e) => updateSlide(activeSlide.id, { title: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Key Points (one per line)</label>
          <textarea
            value={(activeSlide.keyPoints || []).join('\n')}
            onChange={(e) => updateSlide(activeSlide.id, { keyPoints: e.target.value.split('\n') })}
            className="w-full p-2 border border-gray-300 rounded-md text-sm h-24"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Layout Reference</label>
          <input
            type="text"
            value={activeSlide.layout || ''}
            onChange={(e) => updateSlide(activeSlide.id, { layout: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image Prompt</label>
          <textarea
            value={activeSlide.imagePrompt || ''}
            onChange={(e) => updateSlide(activeSlide.id, { imagePrompt: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md text-sm h-32"
          />
        </div>

        <button
          onClick={() => generateImageForSlide(activeSlide.id)}
          disabled={activeSlide.status === 'generating'}
          className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {activeSlide.status === 'generating' ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Generating...</>
          ) : (
            <><Wand2 className="w-4 h-4" /> Regenerate Image</>
          )}
        </button>
      </div>
    </div>
  );
}
