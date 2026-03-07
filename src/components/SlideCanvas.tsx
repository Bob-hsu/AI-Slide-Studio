import React, { useRef, useState, useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { SlideElement } from '../types';
import { cn } from '../utils/cn';

export default function SlideCanvas() {
  const { presentation, activeSlideId, selectedElementId, setSelectedElement, updateElement } = useEditorStore();
  const activeSlide = presentation?.slides.find(s => s.id === activeSlideId);
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const availableWidth = width - 64; // 32px padding on each side
      const availableHeight = height - 64;
      const scaleX = availableWidth / 960;
      const scaleY = availableHeight / 540;
      const newScale = Math.min(scaleX, scaleY);
      setScale(newScale > 0 ? newScale : 1);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  if (!activeSlide) return <div className="flex-1 bg-gray-100 flex items-center justify-center">Select a slide</div>;

  if (presentation?.isImagePPT && activeSlide.imageUrl) {
    return (
      <div ref={containerRef} className="flex-1 bg-gray-100 overflow-hidden flex items-center justify-center">
        <div 
          className="w-[960px] h-[540px] bg-white shadow-xl relative overflow-hidden flex items-center justify-center shrink-0 transition-transform duration-75"
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
        >
          <img src={activeSlide.imageUrl} alt="Slide" className="w-full h-full object-cover" />
        </div>
      </div>
    );
  }

  if (presentation?.isImagePPT && !activeSlide.imageUrl && activeSlide.elements.length === 0) {
    return (
      <div ref={containerRef} className="flex-1 bg-gray-100 overflow-hidden flex items-center justify-center">
        <div 
          className="w-[960px] h-[540px] bg-white shadow-xl relative overflow-hidden flex items-center justify-center shrink-0 transition-transform duration-75"
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
        >
          {activeSlide.status === 'generating' ? (
            <div className="flex flex-col items-center text-indigo-600">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-medium">Generating Slide Image...</p>
            </div>
          ) : activeSlide.status === 'error' ? (
            <div className="text-red-500 font-medium">Failed to generate image. Please check settings and try again.</div>
          ) : (
            <div className="text-gray-400 font-medium text-center px-8">
              <p className="mb-2">Ready to generate.</p>
              <p className="text-sm">Enter title and key points in the right panel, then click "Regenerate Image".</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleMouseDown = (e: React.MouseEvent, element: SlideElement) => {
    e.stopPropagation();
    setSelectedElement(element.id);
    setIsDragging(true);
    
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setDragOffset({
        x: (e.clientX - rect.left) / scale - element.x,
        y: (e.clientY - rect.top) / scale - element.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElementId || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = (e.clientX - rect.left) / scale - dragOffset.x;
    const newY = (e.clientY - rect.top) / scale - dragOffset.y;

    updateElement(activeSlideId!, selectedElementId, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasClick = () => {
    setSelectedElement(null);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>, elementId: string) => {
    updateElement(activeSlideId!, elementId, { content: e.target.value });
  };

  return (
    <div ref={containerRef} className="flex-1 bg-gray-100 overflow-hidden flex items-center justify-center">
      <div 
        ref={canvasRef}
        className="w-[960px] h-[540px] bg-white shadow-xl relative overflow-hidden shrink-0 transition-transform duration-75"
        style={{ 
          background: activeSlide.background,
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        }}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {activeSlide.elements.map(element => (
          <div
            key={element.id}
            className={cn(
              "absolute cursor-move border-2",
              selectedElementId === element.id ? "border-blue-500" : "border-transparent hover:border-gray-300"
            )}
            style={{
              left: element.x,
              top: element.y,
              width: element.width,
              height: element.height,
              ...element.style
            }}
            onMouseDown={(e) => handleMouseDown(e, element)}
          >
            {element.type === 'text' && (
              <textarea
                value={element.content}
                onChange={(e) => handleTextChange(e, element.id)}
                className="w-full h-full bg-transparent resize-none outline-none overflow-hidden"
                style={{
                  fontSize: element.style?.fontSize,
                  fontWeight: element.style?.fontWeight,
                  color: element.style?.color,
                  lineHeight: element.style?.lineHeight,
                  textAlign: element.style?.textAlign as any,
                }}
              />
            )}
            {element.type === 'image' && element.content && (
              <img 
                src={element.content} 
                alt="Slide element" 
                className="w-full h-full object-contain pointer-events-none"
                referrerPolicy="no-referrer"
              />
            )}
            {element.type === 'shape' && (
              <div className="w-full h-full pointer-events-none" style={element.style} />
            )}
            {selectedElementId === element.id && (
              <>
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-nwse-resize" />
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-nesw-resize" />
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-nesw-resize" />
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-nwse-resize" />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
