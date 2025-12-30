import React from 'react';
import OverlaySticker from './OverlaySticker';

/**
 * TranslationOverlay - HTML container for all translation stickers
 * 
 * @param {Object} props
 * @param {Array} props.blocks - Array of translation blocks
 * @param {Object} props.imageDimensions - {width, height}
 * @param {Object} props.containerSize - {width, height} of the rendered container
 * @param {boolean} props.showOverlay - Toggle visibility
 */
const TranslationOverlay = ({ blocks, imageDimensions, containerSize, showOverlay }) => {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/33364902-f918-42f6-a6a0-44ee4a35f799',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TranslationOverlay.jsx:14',message:'Render Overlay',data:{blocksCount:blocks?.length,imageDimensions,containerSize,showOverlay},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  if (!imageDimensions || !imageDimensions.width || !imageDimensions.height) return null;
  
  // No scaling needed as we use percentage-based positioning
  // The container is handled by the parent grid layout

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        visibility: showOverlay ? 'visible' : 'hidden',
        position: 'relative', // Ensure children absolute positioning is relative to this
      }}
    >
      {blocks.map((block, index) => (
        <div key={index} style={{ pointerEvents: 'auto' }}>
          <OverlaySticker
            block={block}
            index={index}
            imageDimensions={imageDimensions}
            containerSize={containerSize}
            isVisible={true} // Visibility handled by parent container
          />
        </div>
      ))}
    </div>
  );
};

export default TranslationOverlay;
