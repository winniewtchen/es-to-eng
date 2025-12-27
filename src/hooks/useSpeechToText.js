import { useState, useEffect, useRef, useCallback } from 'react';

export function useSpeechToText(lang = 'en-US') {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef(null);
  // Use a ref to track listening state to avoid stale closures
  const isListeningRef = useRef(false);

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
      // Sync ref and state when recognition ends
      isListeningRef.current = false;
      setIsListening(false);
      setInterimTranscript('');
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      // Handle network errors gracefully - just stop and let user retry
      if (event.error === 'network') {
        isListeningRef.current = false;
        setIsListening(false);
        setInterimTranscript('');
        // Don't abort here, just let onend handle cleanup
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        isListeningRef.current = false;
        setIsListening(false);
      }
      // 'no-speech' and 'aborted' are benign, recognition usually stops anyway
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognition) {
        try {
          recognition.abort();
        } catch (e) {
          // Ignore abort errors on cleanup
        }
      }
      isListeningRef.current = false;
    };
  }, [lang]);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    // Use ref to prevent double start (avoids stale closure issue)
    if (isListeningRef.current) return;

    try {
      // Clear previous transcript on new recording session
      setTranscript('');
      setInterimTranscript('');

      // Mark as listening before starting to prevent race conditions
      isListeningRef.current = true;
      setIsListening(true);

      recognition.start();
    } catch (e) {
      // If start fails, reset state
      console.error("Start error", e);
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    // Only stop if actually listening
    if (!isListeningRef.current) return;

    try {
      recognition.stop();
    } catch (e) {
      // If stop fails, force reset state
      console.error("Stop error", e);
    }

    // Always update state when stop is called
    isListeningRef.current = false;
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening
  };
}
