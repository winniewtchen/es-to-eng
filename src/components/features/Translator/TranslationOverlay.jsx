import React from 'react';
import OverlaySticker from './OverlaySticker';

/**
 * TranslationOverlay - SVG container for all translation stickers
 * 
 * @param {Object} props
 * @param {Array} props.blocks - Array of translation blocks
 * @param {Object} props.imageDimensions - {width, height}
 * @param {boolean} props.showOverlay - Toggle visibility
 */
const TranslationOverlay = ({ blocks, imageDimensions, showOverlay }) => {
  if (!imageDimensions || !imageDimensions.width || !imageDimensions.height) return null;

  return (
    <svg
      width={imageDimensions.width}
      height={imageDimensions.height}
      viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Allow clicks to pass through to image, stickers re-enable pointer-events
      }}
    >
      <defs>
        <filter id="sticker-shadow">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.5"/>
        </filter>
      </defs>
      
      {blocks.map((block, index) => (
        <g key={index} style={{ pointerEvents: 'auto' }}>
          <OverlaySticker
            block={block}
            imageDimensions={imageDimensions}
            isVisible={showOverlay}
          />
        </g>
      ))}
    </svg>
  );
};

export default TranslationOverlay;

