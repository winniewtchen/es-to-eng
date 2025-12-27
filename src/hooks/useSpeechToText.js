import { useState, useEffect, useRef, useCallback } from 'react';

export function useSpeechToText(lang = 'en-US') {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error("Web Speech API not supported.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // continuous: true to prevent early cutoff
    recognition.continuous = true; 
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (final) {
          setTranscript(prev => (prev + ' ' + final).trim());
      }
      setInterimTranscript(interim);
    };

    recognition.onend = () => {
      // Only set listening to false if it wasn't a manual stop?
      // For now, simple behavior: if it ends, it ends.
      // But with continuous=true, it shouldn't end unless we stop it or it errors/times out.
      setIsListening(false);
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
             setIsListening(false);
        }
        // benign errors like 'no-speech' should not stop listening if we want truly robust,
        // but often browsers usually stop anyway.
    }

    recognitionRef.current = recognition;
    
    return () => {
        if (recognition) {
            recognition.abort();
        }
    }
  }, [lang]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
          if (isListening) return; // Prevent double start
          setTranscript(''); 
          recognitionRef.current.start();
          setIsListening(true);
      } catch(e) {
          console.error("Start error", e)
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening
  };
}
