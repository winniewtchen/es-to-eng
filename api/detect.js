// Vercel serverless function for language detection using Google Cloud Translation API
// Rate limited to 5 requests per minute per IP

const rateLimitMap = new Map();
const RATE_LIMIT = 5;
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

function validateInput(text) {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Text is required' };
  }
  
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Text cannot be empty' };
  }
  
  if (trimmed.length > 500) {
    return { valid: false, error: 'Text exceeds 500 character limit' };
  }
  
  const suspiciousPatterns = /<script|javascript:|on\w+=/i;
  if (suspiciousPatterns.test(trimmed)) {
    return { valid: false, error: 'Invalid input detected' };
  }
  
  return { valid: true, text: trimmed };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please wait a minute.' });
  }

  const { text } = req.body;

  const validation = validateInput(text);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const url = `https://translation.googleapis.com/language/translate/v2/detect?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: validation.text
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('Google Translate detect error:', data.error);
      return res.status(500).json({ error: 'Detection failed' });
    }

    const detection = data.data?.detections?.[0]?.[0];
    return res.status(200).json({
      language: detection?.language || 'en',
      confidence: detection?.confidence || 0
    });
    
  } catch (err) {
    console.error('Detection error:', err);
    return res.status(500).json({ error: 'Detection failed' });
  }
}
