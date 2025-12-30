import React, { useState, useRef, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { X, Eye, EyeOff, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import TranslationOverlay from './TranslationOverlay';
import { Button } from '@/components/ui/button';

const ImageTranslationView = ({ 
  imageUrl, 
  translationData, 
  onClose,
  isProcessing,
  targetLang,
  onLanguageChange,
  languages = {}
}) => {
  const [showOverlay, setShowOverlay] = useState(true);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/33364902-f918-42f6-a6a0-44ee4a35f799',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ImageTranslationView.jsx:25',message:'ResizeObserver update',data:{width:entry.contentRect.width,height:entry.contentRect.height, imageUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  if (!imageUrl) return null;

  const { blocks, imageDimensions } = translationData || { blocks: [], imageDimensions: { width: 0, height: 0 } };

  return (
    <div className="relative w-full h-full bg-black flex flex-col overflow-hidden">
      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </Button>
        
        <div className="flex gap-2 items-center">
           {languages && onLanguageChange && (
             <select
               value={targetLang}
               onChange={(e) => onLanguageChange(e.target.value)}
               className="bg-black/40 text-white border border-white/20 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-white/50 mr-2 h-9"
               onClick={(e) => e.stopPropagation()}
             >
               {Object.values(languages).map(lang => (
                 <option key={lang.code} value={lang.code} className="bg-black text-white">
                   To: {lang.label}
                 </option>
               ))}
             </select>
           )}

           <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowOverlay(!showOverlay)}
            className="text-white hover:bg-white/20"
          >
            {showOverlay ? <Eye className="h-6 w-6" /> : <EyeOff className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Main Viewer */}
      <div className="flex-1 w-full h-full flex items-center justify-center">
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={4}
          centerOnInit
          wheel={{ step: 0.1 }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Zoom Controls Overlay */}
              <div className="absolute bottom-20 right-4 z-50 flex flex-col gap-2">
                <Button variant="secondary" size="icon" onClick={() => zoomIn()} className="rounded-full opacity-80 hover:opacity-100">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon" onClick={() => zoomOut()} className="rounded-full opacity-80 hover:opacity-100">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon" onClick={() => resetTransform()} className="rounded-full opacity-80 hover:opacity-100">
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>

              <TransformComponent
                wrapperClass="!w-full !h-full"
                contentClass="!w-full !h-full flex items-center justify-center"
              >
                {/* 
                    Using CSS Grid ensures the container and overlay match the image size perfectly.
                    The image drives the size of the grid cell, and the overlay fills it.
                */}
                <div 
                  ref={containerRef}
                  style={{ 
                    display: 'grid', 
                    gridTemplateAreas: '"stack"', 
                    width: 'fit-content', 
                    height: 'fit-content' 
                  }}
                >
                  <img 
                    src={imageUrl} 
                    alt="Original" 
                    className="block"
                    style={{
                      gridArea: 'stack',
                      height: 'auto',
                      width: 'auto',
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                  
                  <div style={{ gridArea: 'stack', zIndex: 10, pointerEvents: 'none' }}>
                    {!isProcessing && translationData && (
                      <TranslationOverlay
                        blocks={blocks}
                        imageDimensions={imageDimensions}
                        showOverlay={showOverlay}
                        containerSize={containerSize}
                      />
                    )}
                  </div>
                  
                  {isProcessing && (
                     <div 
                       className="bg-black/40 flex items-center justify-center"
                       style={{ gridArea: 'stack', zIndex: 20 }}
                     >
                       <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                     </div>
                  )}
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  );
};

export default ImageTranslationView;
