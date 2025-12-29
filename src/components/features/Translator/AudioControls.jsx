import React, { useCallback, useMemo, useRef } from "react";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMicLevel } from "@/hooks/useMicLevel";
import P5WaveShader from "@/components/features/Translator/P5WaveShader";

const AudioControls = ({ isListening, onStartListening, onStopListening }) => {
    const { level } = useMicLevel({ enabled: isListening });
    const activeRef = useRef(false);

    const start = useCallback(() => {
        if (activeRef.current) return;
        activeRef.current = true;
        onStartListening?.();
    }, [onStartListening]);

    const stop = useCallback(() => {
        if (!activeRef.current) return;
        activeRef.current = false;
        onStopListening?.();
    }, [onStopListening]);

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
        <div className="fixed bottom-8 left-0 right-0 flex justify-center p-4 gradient-mask-t pointer-events-none">
            <div
                className={cn(
                    // isolate avoids negative z-index issues in some layouts; keeps shader behind button but visible
                    "relative isolate flex h-32 w-32 items-center justify-center pointer-events-auto touch-none cursor-pointer group"
                )}
                {...pointerHandlers}
                // Ensure the div can receive focus for keyboard accessibility
                tabIndex={0}
                role="button"
                aria-label={label}
                aria-pressed={isListening}
            >
                {/* Shader Wave Visualization (white bg, black wave) */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-full">
                    <P5WaveShader className="h-full w-full" level={level} active={isListening} />
                </div>

                {/* Control Button Visuals */}
                <div
                    className={cn(
                        "relative z-10 flex h-20 w-20 items-center justify-center rounded-full shadow-xl transition-all duration-200 pointer-events-none",
                        "bg-black text-white",
                        isListening ? "scale-105" : "group-hover:scale-105 group-active:scale-95"
                    )}
                >
                    <Mic
                        className={cn(
                            "h-8 w-8 transition-colors duration-200",
                            isListening ? "text-red-500 animate-pulse" : "text-white"
                        )}
                    />
                </div>
            </div>
        </div>
    );
};

export default AudioControls;
