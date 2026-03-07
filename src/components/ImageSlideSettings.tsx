import React, { useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Wand2, Image as ImageIcon, Edit2 } from 'lucide-react';

export default function ImageSlideSettings() {
  const { presentation, activeSlideId, updateSlide, generateImageForSlide, editImageForSlide } = useEditorStore();
  const activeSlide = presentation?.slides.find(s => s.id === activeSlideId);
  const [editPrompt, setEditPrompt] = useState('');

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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image Size (Nano Banana Pro)</label>
          <select
            value={presentation.imageSize || '1K'}
            onChange={(e) => useEditorStore.getState().updateSlide(activeSlide.id, { ...activeSlide })} // Just to trigger re-render if needed, actually we should update presentation
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
            onChangeCapture={(e) => {
              useEditorStore.setState((state) => ({
                presentation: state.presentation ? { ...state.presentation, imageSize: (e.target as HTMLSelectElement).value } : null
              }));
            }}
          >
            <option value="1K">1K</option>
            <option value="2K">2K</option>
            <option value="4K">4K</option>
          </select>
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

        {activeSlide.imageUrl && (
          <div className="pt-4 border-t border-gray-200 mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Edit Image (Nano Banana 2)</label>
            <div className="flex flex-col gap-2">
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="e.g., Change the background to blue..."
                className="w-full p-2 border border-gray-300 rounded-md text-sm h-20"
              />
              <button
                onClick={() => {
                  if (editPrompt.trim()) {
                    editImageForSlide(activeSlide.id, editPrompt);
                    setEditPrompt('');
                  }
                }}
                disabled={activeSlide.status === 'generating' || !editPrompt.trim()}
                className="w-full py-2 bg-white border border-indigo-600 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" /> Edit Current Image
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
