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
    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    
    const visionResponse = await fetch(visionUrl, {
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
            type: 'TEXT_DETECTION',
            maxResults: 1
          }]
        }]
      })
    });

    const visionData = await visionResponse.json();
    
    if (visionData.error) {
      console.error('Google Vision error:', visionData.error);
      return res.status(500).json({ error: 'Image processing failed' });
    }

    // Extract text from OCR response
    const textAnnotations = visionData.responses?.[0]?.textAnnotations;
    if (!textAnnotations || textAnnotations.length === 0) {
      return res.status(200).json({ 
        originalText: '', 
        translatedText: '',
        message: 'No text found in image'
      });
    }

    // First annotation contains the full text
    const originalText = sanitizeOutput(textAnnotations[0].description);
    
    if (!originalText) {
      return res.status(200).json({ 
        originalText: '', 
        translatedText: '',
        message: 'No text found in image'
      });
    }

    // Step 2: Translate the extracted text
    const translateUrl = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    
    const translateResponse = await fetch(translateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: originalText,
        target: targetLang,
        format: 'text'
      })
    });

    const translateData = await translateResponse.json();
    
    if (translateData.error) {
      console.error('Google Translate error:', translateData.error);
      // Return original text even if translation fails
      return res.status(200).json({ 
        originalText,
        translatedText: '',
        error: 'Translation failed, but text was extracted'
      });
    }

    const translatedText = sanitizeOutput(
      translateData.data?.translations?.[0]?.translatedText
    );

    return res.status(200).json({
      originalText,
      translatedText,
      detectedLanguage: translateData.data?.translations?.[0]?.detectedSourceLanguage
    });
    
  } catch (err) {
    console.error('Image translation error:', err);
    return res.status(500).json({ error: 'Image translation failed' });
  }
}

