import { useEffect, useRef, useState } from "react";

/**
 * Lightweight mic intensity meter using Web Audio API.
 * Returns a normalized level in [0, 1].
 */
export function useMicLevel({ enabled }) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataRef = useRef(null);
  const smoothRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        audioContextRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.4;
        source.connect(analyser);

        analyserRef.current = analyser;
        const data = new Uint8Array(analyser.fftSize);
        dataRef.current = data;

        const tick = () => {
          const a = analyserRef.current;
          const d = dataRef.current;
          if (!a || !d) return;

          a.getByteTimeDomainData(d);

          // Compute RMS from centered waveform
          let sum = 0;
          for (let i = 0; i < d.length; i++) {
            const v = (d[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / d.length);

          // Gentle compression + smoothing for UI friendliness
          const compressed = Math.min(1, rms * 3.0);
          const prev = smoothRef.current;
          const next = prev + (compressed - prev) * 0.25;
          smoothRef.current = next;

          setLevel(next);
          rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        // Permission denied or unsupported — just fall back to 0.
        setLevel(0);
      }
    }

    function stop() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      smoothRef.current = 0;
      setLevel(0);

      if (analyserRef.current) analyserRef.current.disconnect?.();
      analyserRef.current = null;
      dataRef.current = null;

      const stream = streamRef.current;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      const ctx = audioContextRef.current;
      if (ctx) ctx.close?.();
      audioContextRef.current = null;
    }

    if (!enabled) {
      stop();
      return;
    }

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled]);

  return { level };
}


