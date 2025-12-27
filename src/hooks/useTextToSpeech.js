import { useState, useEffect, useCallback } from 'react';

export const useTextToSpeech = () => {
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    
    loadVoices();
    
    // Chrome loads voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    return () => {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const speak = useCallback((text, langCode = 'es-MX') => {
    if (!text) return;

    // Cancel currently playing audio to avoid queue overlap
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to find a specific voice for the requested language
    // Priority: Exact match (es-MX) -> Region match (es-*) -> First available
    // For "Authentic Spanish", we prefer Mexico (es-MX) or Spain (es-ES)
    
    let voice = null;
    
    if (langCode.startsWith('es')) {
        // Prefer Mexican Spanish for authenticity in this specific "Rápido" context (Mexico travel)
        voice = voices.find(v => v.lang === 'es-MX');
        if (!voice) voice = voices.find(v => v.lang === 'es-ES');
        if (!voice) voice = voices.find(v => v.lang.startsWith('es'));
    } else {
        // Generic fallback for other languages
        voice = voices.find(v => v.lang === langCode) || 
                voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
    }

    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.lang = langCode; 
    utterance.rate = 1.0; 
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  }, [voices]);

  return { speak };
};
