import React, { useCallback, useMemo, useRef } from "react";
import { Mic, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const BottomControls = ({ 
  isListening, 
  onStartListening, 
  onStopListening,
  onCameraClick 
}) => {
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
        <div className="fixed bottom-8 left-0 right-0 flex justify-center items-center gap-8 p-4 gradient-mask-t pointer-events-none z-40">
             {/* Camera Button */}
             <div className="flex h-24 w-24 items-center justify-center pointer-events-auto">
                <Button
                    variant="secondary"
                    size="icon"
                    className="h-20 w-20 rounded-full shadow-xl border-2 border-transparent hover:border-gray-500/50 hover:bg-white transition-all duration-200 hover:scale-105 active:scale-95"
                    onClick={onCameraClick}
                    title="Translate Image"
                >
                    <Camera className="h-8 w-8 text-black" />
                </Button>
            </div>

            {/* Mic Button */}
            <div
                className={cn(
                    // isolate avoids negative z-index issues in some layouts
                    "relative isolate flex h-24 w-24 items-center justify-center pointer-events-auto touch-none cursor-pointer group"
                )}
                {...pointerHandlers}
                // Ensure the div can receive focus for keyboard accessibility
                tabIndex={0}
                role="button"
                aria-label={label}
                aria-pressed={isListening}
            >
                {/* Control Button Visuals */}
                <div
                    className={cn(
                        "relative z-10 flex h-20 w-20 items-center justify-center rounded-full shadow-xl transition-all duration-200",
                        "bg-black text-white border-2 border-transparent",
                        isListening ? "scale-110 border-gray-500/50 bg-gray-900" : "group-hover:scale-105 group-active:scale-95"
                    )}
                >
                    <Mic
                        className={cn(
                            "h-8 w-8 transition-colors duration-200 text-white"
                        )}
                    />
                </div>
                
                {/* Ripple effect when listening */}
                {isListening && (
                    <div className="absolute inset-0 rounded-full animate-ping bg-gray-500/40" />
                )}
            </div>
        </div>
    );
};

export default BottomControls;

