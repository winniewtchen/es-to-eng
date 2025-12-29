// Vercel serverless function for OpenAI Text-to-Speech
// Rate limited to 30 requests per minute per IP

// Simple in-memory rate limiter (resets on cold start)
const rateLimitMap = new Map();
const RATE_LIMIT = 30;
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
function validateInput(text) {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Text is required' };
  }
  
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Text cannot be empty' };
  }
  
  // OpenAI TTS has a 4096 character limit
  if (trimmed.length > 4096) {
    return { valid: false, error: 'Text exceeds 4096 character limit' };
  }
  
  return { valid: true, text: trimmed };
}

// Valid OpenAI TTS voices
const VALID_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse'];

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

  const { text, voice = 'coral' } = req.body;

  // Validate input
  const validation = validateInput(text);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  // Validate voice
  if (!VALID_VOICES.includes(voice)) {
    return res.status(400).json({ error: 'Invalid voice selection' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice: voice,
        input: validation.text,
        response_format: 'mp3',
        instructions: 'Speak slowly and clearly, as if teaching a language learner. Use natural pauses between phrases and enunciate each word distinctly.'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI TTS error:', errorData);
      return res.status(500).json({ error: 'Text-to-speech failed' });
    }

    // Stream the audio response directly to the client
    const audioBuffer = await response.arrayBuffer();
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    return res.send(Buffer.from(audioBuffer));
    
  } catch (err) {
    console.error('TTS error:', err);
    return res.status(500).json({ error: 'Text-to-speech failed' });
  }
}

