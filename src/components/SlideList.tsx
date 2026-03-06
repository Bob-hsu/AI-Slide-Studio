import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '../utils/cn';

export default function SlideList() {
  const { presentation, activeSlideId, setActiveSlide, addSlide, deleteSlide } = useEditorStore();

  if (!presentation) return null;

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="font-semibold text-gray-700">Slides</h2>
        {!presentation.isImagePPT && (
          <button 
            onClick={() => addSlide()}
            className="p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-indigo-600 transition-colors"
            title="Add Slide"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {presentation.slides.map((slide, index) => (
          <div 
            key={slide.id}
            onClick={() => setActiveSlide(slide.id)}
            className={cn(
              "group relative aspect-video rounded-lg border-2 cursor-pointer overflow-hidden transition-all bg-white",
              activeSlideId === slide.id 
                ? "border-indigo-500 shadow-md ring-2 ring-indigo-200" 
                : "border-gray-200 hover:border-gray-300"
            )}
            style={!presentation.isImagePPT ? { background: slide.background } : undefined}
          >
            <div className="absolute top-2 left-2 bg-white/80 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded shadow-sm text-gray-700 z-10">
              {index + 1}
            </div>
            
            {presentation.isImagePPT ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                {slide.imageUrl ? (
                  <img src={slide.imageUrl} alt={`Slide ${index + 1}`} className="w-full h-full object-cover" />
                ) : slide.status === 'generating' ? (
                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="text-xs text-gray-400">Pending</span>
                )}
              </div>
            ) : (
              <div className="w-full h-full p-2 origin-top-left transform scale-[0.2] pointer-events-none">
                {slide.elements.map(element => (
                  <div
                    key={element.id}
                    className="absolute"
                    style={{
                      left: element.x,
                      top: element.y,
                      width: element.width,
                      height: element.height,
                      ...element.style
                    }}
                  >
                    {element.type === 'text' && (
                      <div 
                        className="w-full h-full truncate"
                        style={{
                          fontSize: element.style?.fontSize,
                          fontWeight: element.style?.fontWeight,
                          color: element.style?.color,
                        }}
                      >
                        {element.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!presentation.isImagePPT && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSlide(slide.id);
                }}
                className="absolute top-2 right-2 p-1.5 bg-white text-red-500 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 z-10"
                title="Delete Slide"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
