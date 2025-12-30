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
const OverlaySticker = ({ block, imageDimensions, containerSize, isVisible = true, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!block || !block.translatedText || !isVisible) return null;

  const { x, y, width, height } = block.boundingBox;
  
  // Use percentage based positioning
  const leftPct = x * 100;
  const topPct = y * 100;
  const widthPct = width * 100;
  const heightPct = height * 100;

  // Determine current rendering dimensions for font size calculation
  // Fallback to imageDimensions if containerSize is not yet available (initial render)
  // but be careful not to create huge fonts if container is actually small.
  // Using containerSize if available is best.
  const currentW = containerSize?.width || imageDimensions.width;
  const currentH = containerSize?.height || imageDimensions.height;

  // Convert normalized coordinates to absolute pixels based on current render size
  const absW = width * currentW;
  const absH = height * currentH;
  
  // Calculate dynamic font size based on box area and text length
  const textLength = block.translatedText.length || 1;
  const area = absW * absH;
  const estimatedFontSize = Math.sqrt(area / (textLength * 0.6)); // 0.6 is approx char aspect ratio
  
  // Clamp font size: min 10px, max 90% of height or 120px
  // In mobile view (small container), absH might be very small (e.g., 17px).
  // If we clamp min to 10px, it might be okay, but if the box is only 15px high, 10px font + padding might overflow.
  // We need to ensure the container itself is visible.
  
  // If the calculated dimension is extremely small, we force a minimum visible size for the TOUCH TARGET,
  // but we might need to scale the text differently.
  
  const minDimension = 20; // Minimum touch target size in pixels
  const finalW = Math.max(absW, isExpanded ? 0 : minDimension);
  const finalH = Math.max(absH, isExpanded ? 0 : minDimension);

  // Re-calculate font size based on the potentially forced minimum dimension
  // if we are using the forced dimension, we might want to scale down text or just accept it is small.
  // Actually, the issue might be that 17px height is just too small to render comfortably with padding.
  
  const fontSize = Math.max(10, Math.min(estimatedFontSize, finalH * 0.9, 120));
  
  // #region agent log
  if (index === 0) {
    fetch('http://127.0.0.1:7245/ingest/33364902-f918-42f6-a6a0-44ee4a35f799',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OverlaySticker.jsx:45',message:'Sticker Calc',data:{text:block.translatedText, absW, absH, finalW, finalH, fontSize, leftPct, topPct, currentW, currentH},timestamp:Date.now(),sessionId:'debug-session',runId:'run3-fix',hypothesisId:'H3'})}).catch(()=>{});
  }
  // #endregion
  
  // padding for the text
  const padding = 4;
  
  return (
    <div
      className="absolute"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: `${widthPct}%`,
        height: `${heightPct}%`,
        // overflow-visible is default for divs unless specified otherwise
        // FORCE visibility to ensure it's not hidden by parent overflow
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
          // Use min-width/height to ensure visibility even if calculated size is tiny
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
          // Center the expanded box over the anchor point if we forced size
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

export default OverlaySticker;
