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
