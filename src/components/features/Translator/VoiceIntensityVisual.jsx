import React, { useCallback, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial } from "@react-three/drei";
import { Mic } from "lucide-react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { useMicLevel } from "@/hooks/useMicLevel";

function Wave({ level, isListening }) {
  const materialRef = useRef();

  useFrame(() => {
    if (materialRef.current) {
      // Smoothly interpolate distortion and speed
      // When listening: high distortion (based on level), high speed
      // When idle: low distortion, low speed
      const targetDistort = isListening ? 0.3 + level * 0.5 : 0.1;
      const targetSpeed = isListening ? 2 + level * 3 : 0.5;

      materialRef.current.distort = THREE.MathUtils.lerp(
        materialRef.current.distort,
        targetDistort,
        0.1
      );
      materialRef.current.speed = THREE.MathUtils.lerp(
        materialRef.current.speed,
        targetSpeed,
        0.1
      );
    }
  });

  return (
    <Sphere args={[1, 64, 64]} scale={1.8}>
      <MeshDistortMaterial
        ref={materialRef}
        color={isListening ? "#4f46e5" : "#1f2937"} // Indigo-600 vs Gray-800
        toneMapped={false}
        roughness={0.2}
        metalness={0.8}
        distort={0.4} // Initial value
        speed={2} // Initial value
      />
    </Sphere>
  );
}

/**
 * Voice Intensity Visualizer Button
 * Uses Three.js for a fluid wave animation behind a central microphone button.
 */
export default function VoiceIntensityVisual({
  isListening,
  onStart,
  onStop,
  className,
}) {
  const { level } = useMicLevel({ enabled: isListening });
  const activeRef = useRef(false);

  const start = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    onStart?.();
  }, [onStart]);

  const stop = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    onStop?.();
  }, [onStop]);

  const pointerHandlers = useMemo(
    () => ({
      onPointerDown: (e) => {
        // Only left click / primary touch/pen
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        start();
      },
      onPointerUp: (e) => {
        e.preventDefault();
        stop();
      },
      onPointerCancel: (e) => {
        e.preventDefault();
        stop();
      },
      onPointerLeave: () => {
        // Optional: stop on leave or keep listening if pointer captured?
        // Original behavior was stop on leave.
        stop();
      },
      onContextMenu: (e) => e.preventDefault(),
      onKeyDown: (e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          start();
        }
      },
      onKeyUp: (e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          stop();
        }
      },
    }),
    [start, stop]
  );

  const label = isListening ? "Release to stop" : "Hold to speak";

  return (
    <div
      className={cn(
        "relative flex h-32 w-32 items-center justify-center",
        className
      )}
    >
      {/* 3D Wave Visualization */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 4] }}>
          <ambientLight intensity={1.5} />
          <pointLight position={[10, 10, 10]} intensity={2} />
          <Wave level={level} isListening={isListening} />
        </Canvas>
      </div>

      {/* Control Button */}
      <button
        type="button"
        aria-label={label}
        aria-pressed={isListening}
        className={cn(
          "relative z-10 flex h-20 w-20 items-center justify-center rounded-full shadow-xl transition-all duration-200",
          "bg-black text-white",
          "focus-visible:ring-4 focus-visible:ring-primary/50 focus-visible:outline-none",
          isListening ? "scale-105" : "hover:scale-105 active:scale-95"
        )}
        {...pointerHandlers}
      >
        <Mic
          className={cn(
            "h-8 w-8 transition-colors duration-200",
            isListening ? "text-red-500 animate-pulse" : "text-white"
          )}
        />
      </button>
    </div>
  );
}
