import React, { useState } from 'react';

/**
 * OverlaySticker - Renders a single translated text block
 * 
 * @param {Object} props
 * @param {Object} props.block - The translation block data
 * @param {string} props.block.translatedText - The translated text
 * @param {Object} props.block.boundingBox - Normalized coordinates {x, y, width, height}
 * @param {Object} props.imageDimensions - {width, height} of the original image
 * @param {boolean} props.isVisible - Whether the sticker is visible
 */
const OverlaySticker = ({ block, imageDimensions, isVisible = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!block || !block.translatedText || !isVisible) return null;

  const { x, y, width, height } = block.boundingBox;
  const { width: imgW, height: imgH } = imageDimensions;

  // Convert normalized coordinates to absolute pixels
  const absX = x * imgW;
  const absY = y * imgH;
  const absW = width * imgW;
  const absH = height * imgH;
  
  // Calculate dynamic font size based on box area and text length
  const textLength = block.translatedText.length || 1;
  const area = absW * absH;
  const estimatedFontSize = Math.sqrt(area / (textLength * 0.6)); // 0.6 is approx char aspect ratio
  
  // Clamp font size: min 12px, max 90% of height or 120px
  const fontSize = Math.max(12, Math.min(estimatedFontSize, absH * 0.9, 120));
  
  // padding for the text
  const padding = 4;
  
  // If expanded, show full text and let it grow
  // If not expanded, clamp it to the box
  
  return (
    <foreignObject
      x={absX}
      y={absY}
      width={absW}
      height={absH}
      className="overflow-visible"
    >
      <div 
        xmlns="http://www.w3.org/1999/xhtml"
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
          minWidth: isExpanded ? `${absW}px` : '0',
          minHeight: isExpanded ? `${absH}px` : '0',
          fontSize: `${fontSize}px`,
          lineHeight: '1.1',
          padding: isExpanded ? `${padding}px` : '1px',
          maxWidth: isExpanded ? '300px' : 'none',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'normal'
        }}
      >
        <span>
          {block.translatedText}
        </span>
      </div>
    </foreignObject>
  );
};

export default OverlaySticker;

