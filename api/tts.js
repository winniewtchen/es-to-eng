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
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/33364902-f918-42f6-a6a0-44ee4a35f799',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/tts.js:48',message:'Handler entry',data:{method:req.method,hasBody:!!req.body},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

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

  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/33364902-f918-42f6-a6a0-44ee4a35f799',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/tts.js:64',message:'Request body parsed',data:{text:text?.substring?.(0,50),textType:typeof text,voice,textLength:text?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,E'})}).catch(()=>{});
  // #endregion

  // Validate input
  const validation = validateInput(text);
  if (!validation.valid) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/33364902-f918-42f6-a6a0-44ee4a35f799',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/tts.js:71',message:'Validation failed',data:{error:validation.error},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return res.status(400).json({ error: validation.error });
  }

  // Validate voice
  if (!VALID_VOICES.includes(voice)) {
    return res.status(400).json({ error: 'Invalid voice selection' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/33364902-f918-42f6-a6a0-44ee4a35f799',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/tts.js:82',message:'API key check',data:{hasApiKey:!!apiKey,keyLength:apiKey?.length,keyPrefix:apiKey?.substring?.(0,7)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/33364902-f918-42f6-a6a0-44ee4a35f799',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/tts.js:90',message:'Calling OpenAI API',data:{model:'gpt-4o-mini-tts',voice,inputLength:validation.text.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

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
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/33364902-f918-42f6-a6a0-44ee4a35f799',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/tts.js:111',message:'OpenAI API error response',data:{status:response.status,statusText:response.statusText,errorData},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.error('OpenAI TTS error:', errorData);
      return res.status(500).json({ error: 'Text-to-speech failed' });
    }

    // Stream the audio response directly to the client
    const audioBuffer = await response.arrayBuffer();
    
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/33364902-f918-42f6-a6a0-44ee4a35f799',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/tts.js:success',message:'OpenAI API success',data:{audioSize:audioBuffer.byteLength},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'success'})}).catch(()=>{});
    // #endregion

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    return res.send(Buffer.from(audioBuffer));
    
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/33364902-f918-42f6-a6a0-44ee4a35f799',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/tts.js:catch',message:'Caught exception',data:{errorName:err.name,errorMessage:err.message,errorStack:err.stack?.substring?.(0,200)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.error('TTS error:', err);
    return res.status(500).json({ error: 'Text-to-speech failed' });
  }
}

