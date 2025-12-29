import { useState, useCallback } from 'react';
import { playTTS, stopTTS } from '../services/tts';

/**
 * Hook for text-to-speech using OpenAI's TTS API
 * Falls back to browser SpeechSynthesis if API fails
 */
export const useTextToSpeech = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Speak text using OpenAI TTS (with browser fallback)
   * @param {string} text - Text to speak
   * @param {string} langCode - Language code (used for fallback voice selection)
   */
  const speak = useCallback(async (text, langCode = 'es-MX') => {
    if (!text) return;

    // Stop any currently playing audio
    stop();
    setError(null);
    setIsLoading(true);

    try {
      await playTTS(text, {
        voice: 'coral',
        playbackRate: 0.9,
        onStart: () => {
          setIsLoading(false);
          setIsPlaying(true);
        },
        onEnd: () => {
          setIsPlaying(false);
        },
        onError: (err) => {
          setIsLoading(false);
          setIsPlaying(false);
          setError(err.message);
        }
      });
    } catch (err) {
      console.warn('OpenAI TTS failed, falling back to browser:', err.message);
      setIsLoading(false);
      
      // Use browser fallback for this call
      speakWithBrowser(text, langCode);
    }
  }, []);

  /**
   * Browser SpeechSynthesis fallback
   */
  const speakWithBrowser = useCallback((text, langCode) => {
    if (!('speechSynthesis' in window)) {
      setError('Speech synthesis not supported');
      return;
    }

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    // Find appropriate voice
    let voice = null;
    if (langCode.startsWith('es')) {
      voice = voices.find(v => v.lang === 'es-MX') ||
              voices.find(v => v.lang === 'es-ES') ||
              voices.find(v => v.lang.startsWith('es'));
    } else {
      voice = voices.find(v => v.lang === langCode) ||
              voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
    }

    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.lang = langCode;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => {
      setIsPlaying(false);
      setError('Speech synthesis failed');
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  /**
   * Stop any currently playing audio
   */
  const stop = useCallback(() => {
    stopTTS();
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  return { 
    speak, 
    stop, 
    isLoading, 
    isPlaying, 
    error 
  };
};
