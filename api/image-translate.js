// Vercel serverless function for image-based translation
// Uses Google Vision API for OCR and Google Translate API for translation

const rateLimitMap = new Map();
const RATE_LIMIT = 30; // Lower limit for image processing (more expensive)
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now - record.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

function validateInput(imageBase64, targetLang) {
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return { valid: false, error: 'Image data is required' };
  }
  
  // Check if it's a valid base64 string (basic check)
  if (imageBase64.length < 100) {
    return { valid: false, error: 'Invalid image data' };
  }
  
  // Limit image size (roughly 10MB base64 = ~7.5MB actual)
  if (imageBase64.length > 10 * 1024 * 1024) {
    return { valid: false, error: 'Image too large (max 10MB)' };
  }
  
  if (!['es', 'en', 'zh'].includes(targetLang)) {
    return { valid: false, error: 'Invalid target language' };
  }
  
  return { valid: true };
}

function sanitizeOutput(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text.slice(0, 5000).trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please wait a minute.' });
  }

  const { imageBase64, targetLang = 'es' } = req.body;

  const validation = validateInput(imageBase64, targetLang);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Step 1: Call Google Vision API for OCR
    const detectText = async (type) => {
      const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
      
      const response = await fetch(visionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: {
              content: imageBase64
            },
            features: [{
              type: type,
              maxResults: 1
            }]
          }]
        })
      });
      return await response.json();
    };

    // Try TEXT_DETECTION first (better for signs/menus), fallback to DOCUMENT_TEXT_DETECTION
    let visionData = await detectText('TEXT_DETECTION');
    let fullTextAnnotation = visionData.responses?.[0]?.fullTextAnnotation;
    
    // Check if we found text. If not, and no error, try fallback
    if ((!fullTextAnnotation || !fullTextAnnotation.text) && !visionData.error) {
      console.log('No text with TEXT_DETECTION, trying DOCUMENT_TEXT_DETECTION');
      visionData = await detectText('DOCUMENT_TEXT_DETECTION');
      fullTextAnnotation = visionData.responses?.[0]?.fullTextAnnotation;
    }

    if (visionData.error) {
      console.error('Google Vision error:', visionData.error);
      return res.status(500).json({ error: 'Image processing failed' });
    }

    // Extract text from OCR response
    // fullTextAnnotation is already set above
    
    if (!fullTextAnnotation || !fullTextAnnotation.text) {
      return res.status(200).json({ 
        originalText: '', 
        translatedText: '',
        message: 'No text found in image',
        blocks: [],
        imageDimensions: { width: 0, height: 0 }
      });
    }

    const originalText = sanitizeOutput(fullTextAnnotation.text);
    
    // Extract blocks and dimensions
    const page = fullTextAnnotation.pages[0];
    const imageWidth = page.width;
    const imageHeight = page.height;
    
    const blocks = [];
    const textsToTranslate = [originalText]; // First element is full text

    // Helper to get bounding box from vertices
    const getBoundingBox = (vertices) => {
      if (!vertices || vertices.length < 4) return null;
      
      const xs = vertices.map(v => v.x || 0);
      const ys = vertices.map(v => v.y || 0);
      
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      
      return {
        x: minX / imageWidth,
        y: minY / imageHeight,
        width: (maxX - minX) / imageWidth,
        height: (maxY - minY) / imageHeight
      };
    };

    // Iterate through blocks to build text segments
    if (page.blocks) {
      for (const block of page.blocks) {
        let blockText = '';
        
        for (const paragraph of block.paragraphs) {
          for (const word of paragraph.words) {
            blockText += word.symbols.map(s => s.text).join('') + 
              (word.symbols[word.symbols.length - 1].property?.detectedBreak ? ' ' : '');
          }
        }
        
        blockText = blockText.trim();
        if (blockText) {
          blocks.push({
            text: blockText,
            boundingBox: getBoundingBox(block.boundingBox.vertices)
          });
          textsToTranslate.push(blockText);
        }
      }
    }

    // Step 2: Translate the extracted text (batch)
    const translateUrl = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    
    const translateResponse = await fetch(translateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: textsToTranslate,
        target: targetLang,
        format: 'text'
      })
    });

    const translateData = await translateResponse.json();
    
    if (translateData.error) {
      console.error('Google Translate error:', translateData.error);
      return res.status(200).json({ 
        originalText,
        translatedText: '',
        error: 'Translation failed, but text was extracted',
        blocks: blocks.map(b => ({ ...b, translatedText: '' })),
        imageDimensions: { width: imageWidth, height: imageHeight }
      });
    }

    const translations = translateData.data?.translations || [];
    const fullTranslatedText = translations[0]?.translatedText || '';
    const detectedLanguage = translations[0]?.detectedSourceLanguage;

    // Map translations back to blocks (skipping first element which is full text)
    const translatedBlocks = blocks.map((block, index) => ({
      ...block,
      translatedText: translations[index + 1]?.translatedText || ''
    }));

    // #region agent log
    try {
      // Use fs to append to log file directly since we are on server side (local environment)
      // Note: In Vercel prod this wouldn't work, but for local dev it should if we have access.
      // If not, we fall back to console. But the instructions say "prefer writing logs directly by appending NDJSON lines... for other languages".
      // Since this is JS but server-side, I can use fs if available, or fetch if the ingestion server is reachable from the server process.
      // I'll use fetch to be consistent with the ingestion endpoint provided.
      fetch('http://127.0.0.1:7245/ingest/33364902-f918-42f6-a6a0-44ee4a35f799',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/image-translate.js:220',message:'Translation Success',data:{imageWidth, imageHeight, blocksCount: translatedBlocks.length, firstBlock: translatedBlocks[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H4'})}).catch(e=>console.error('Log error', e));
    } catch (e) {}
    // #endregion

    return res.status(200).json({
      originalText,
      translatedText: fullTranslatedText,
      detectedLanguage,
      blocks: translatedBlocks,
      imageDimensions: { width: imageWidth, height: imageHeight }
    });
    
  } catch (err) {
    console.error('Image translation error:', err);
    return res.status(500).json({ error: 'Image translation failed' });
  }
}

