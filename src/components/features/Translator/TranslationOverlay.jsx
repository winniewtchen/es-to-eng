import React, { useState } from 'react';

/**
 * OverlaySticker - Renders a single translated text block
 * Internal component used by TranslationOverlay
 */
const OverlaySticker = ({ block, imageDimensions, containerSize }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!block || !block.translatedText) return null;

  const { x, y, width, height } = block.boundingBox;
  
  // Use percentage based positioning
  const leftPct = x * 100;
  const topPct = y * 100;
  const widthPct = width * 100;
  const heightPct = height * 100;

  // Determine current rendering dimensions for font size calculation
  const currentW = containerSize?.width || imageDimensions.width;
  const currentH = containerSize?.height || imageDimensions.height;

  // Convert normalized coordinates to absolute pixels based on current render size
  const absW = width * currentW;
  const absH = height * currentH;
  
  // Calculate dynamic font size based on box area and text length
  const textLength = block.translatedText.length || 1;
  const area = absW * absH;
  const estimatedFontSize = Math.sqrt(area / (textLength * 0.6));
  
  // Minimum touch target size
  const minDimension = 20;
  const finalH = Math.max(absH, isExpanded ? 0 : minDimension);

  // Clamp font size: min 10px, max 90% of height or 120px
  const fontSize = Math.max(10, Math.min(estimatedFontSize, finalH * 0.9, 120));
  const padding = 4;
  
  return (
    <div
      className="absolute"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: `${widthPct}%`,
        height: `${heightPct}%`,
        zIndex: 10,
        overflow: 'visible' 
      }}
    >
      <div 
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className={`
          transition-all duration-200 ease-in-out
          cursor-pointer
          rounded-sm
          bg-black/60 backdrop-blur-[2px]
          border border-white/20
          text-white font-medium
          flex items-center justify-center
          text-center
          ${isExpanded ? 'z-50 scale-110 shadow-lg bg-black/80' : 'z-10 hover:bg-black/70'}
        `}
        style={{
          width: isExpanded ? 'auto' : '100%',
          height: isExpanded ? 'auto' : '100%',
          minWidth: isExpanded ? `${absW}px` : (absW < minDimension ? `${minDimension}px` : '100%'),
          minHeight: isExpanded ? `${absH}px` : (absH < minDimension ? `${minDimension}px` : '100%'),
          fontSize: `${fontSize}px`,
          lineHeight: '1.1',
          padding: isExpanded ? `${padding}px` : '1px',
          maxWidth: isExpanded ? '300px' : 'none',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'normal',
          boxSizing: 'border-box',
          transform: (!isExpanded && (absW < minDimension || absH < minDimension)) ? 'translate(-50%, -50%)' : 'none',
          marginLeft: (!isExpanded && absW < minDimension) ? '50%' : '0',
          marginTop: (!isExpanded && absH < minDimension) ? '50%' : '0',
        }}
      >
        <span style={{ transform: fontSize < 10 ? `scale(${10/fontSize})` : 'none', display: 'inline-block' }}>
          {block.translatedText}
        </span>
      </div>
    </div>
  );
};

/**
 * TranslationOverlay - Container for all translation stickers on an image
 * 
 * @param {Array} props.blocks - Array of translation blocks with boundingBox and translatedText
 * @param {Object} props.imageDimensions - {width, height} of the original image
 * @param {Object} props.containerSize - {width, height} of the rendered container
 * @param {boolean} props.showOverlay - Toggle visibility of all stickers
 */
const TranslationOverlay = ({ blocks, imageDimensions, containerSize, showOverlay }) => {
  if (!imageDimensions?.width || !imageDimensions?.height) return null;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        visibility: showOverlay ? 'visible' : 'hidden',
        position: 'relative',
      }}
    >
      {blocks.map((block, index) => (
        <div key={index} style={{ pointerEvents: 'auto' }}>
          <OverlaySticker
            block={block}
            imageDimensions={imageDimensions}
            containerSize={containerSize}
          />
        </div>
      ))}
    </div>
  );
};

export default TranslationOverlay;
