/**
 * OpenAI Text-to-Speech Service
 * Provides natural-sounding speech synthesis via OpenAI's TTS API
 */

// Currently playing audio instance for stop functionality
let currentAudio = null;

/**
 * Format text to encourage slower, clearer speech
 * Adds natural pause points via punctuation
 */
export function formatTextForSlowSpeech(text) {
  if (!text) return '';
  
  let formatted = text.trim();
  
  // Add slight pauses after common conjunctions if not already punctuated
  formatted = formatted.replace(/\b(and|y|pero|but|or|o)\b(?![,.])/gi, '$1,');
  
  // Ensure sentences end with proper punctuation for natural pauses
  if (!/[.!?]$/.test(formatted)) {
    formatted += '.';
  }
  
  return formatted;
}

/**
 * Play text-to-speech audio from OpenAI API
 * @param {string} text - Text to speak
 * @param {Object} options - Configuration options
 * @param {string} options.voice - OpenAI voice (default: 'coral')
 * @param {number} options.playbackRate - Audio playback rate (default: 0.9 for slower speech)
 * @param {Function} options.onStart - Callback when audio starts playing
 * @param {Function} options.onEnd - Callback when audio finishes
 * @param {Function} options.onError - Callback on error
 * @returns {Promise<void>}
 */
export async function playTTS(text, options = {}) {
  const {
    voice = 'coral',
    playbackRate = 0.9,
    onStart,
    onEnd,
    onError
  } = options;

  // Stop any currently playing audio
  stopTTS();

  if (!text || text.trim().length === 0) {
    return;
  }

  // Client-side validation
  if (text.length > 4096) {
    const error = new Error('Text exceeds 4096 character limit');
    onError?.(error);
    throw error;
  }

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: formatTextForSlowSpeech(text),
        voice
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'TTS request failed');
    }

    // Get the audio blob
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    // Create and play audio
    const audio = new Audio(audioUrl);
    audio.playbackRate = playbackRate;
    currentAudio = audio;

    // Set up event handlers
    audio.onplay = () => {
      onStart?.();
    };

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      onEnd?.();
    };

    audio.onerror = (e) => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      const error = new Error('Audio playback failed');
      onError?.(error);
    };

    await audio.play();

  } catch (err) {
    console.error('TTS error:', err);
    onError?.(err);
    throw err;
  }
}

/**
 * Stop currently playing TTS audio
 */
export function stopTTS() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

/**
 * Check if TTS is currently playing
 */
export function isTTSPlaying() {
  return currentAudio !== null && !currentAudio.paused;
}

