// Vercel serverless function for secure Google Cloud Translation API
// Rate limited to 5 requests per minute per IP

// Simple in-memory rate limiter (resets on cold start, but works for basic protection)
const rateLimitMap = new Map();
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

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

// Input validation
function validateInput(text, targetLang) {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Text is required' };
  }
  
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Text cannot be empty' };
  }
  
  if (trimmed.length > 5000) {
    return { valid: false, error: 'Text exceeds 5000 character limit' };
  }
  
  // Check for suspicious patterns (script injection etc.)
  const suspiciousPatterns = /<script|javascript:|on\w+=/i;
  if (suspiciousPatterns.test(trimmed)) {
    return { valid: false, error: 'Invalid input detected' };
  }
  
  if (!['es', 'en', 'zh'].includes(targetLang)) {
    return { valid: false, error: 'Invalid target language' };
  }
  
  return { valid: true, text: trimmed };
}

// Output sanitization
function sanitizeOutput(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  // Truncate overly long responses
  return text.slice(0, 5000).trim();
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please wait a minute.' });
  }

  const { text, targetLang = 'es' } = req.body;

  // Validate input
  const validation = validateInput(text, targetLang);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Google Cloud Translation API v2
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: validation.text,
        target: targetLang,
        format: 'text'
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('Google Translate error:', data.error);
      return res.status(500).json({ error: 'Translation failed' });
    }

    const translatedText = data.data?.translations?.[0]?.translatedText;
    const translation = sanitizeOutput(translatedText);
    return res.status(200).json({ translation });
    
  } catch (err) {
    console.error('Translation error:', err);
    return res.status(500).json({ error: 'Translation failed' });
  }
}

