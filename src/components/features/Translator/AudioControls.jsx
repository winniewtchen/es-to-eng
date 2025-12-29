import React from 'react';
import { Button } from "@/components/ui/button"
import { Mic } from "lucide-react"
import { cn } from "@/lib/utils"

const AudioControls = ({ isListening, onStartListening, onStopListening }) => {
    return (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center p-4 gradient-mask-t pointer-events-none">
            <Button
                size="lg"
                variant={isListening ? "destructive" : "default"}
                className={cn(
                    "h-24 w-24 rounded-full shadow-lg pointer-events-auto transition-all duration-300 touch-none select-none",
                    isListening ? "scale-110 ring-4 ring-destructive/30" : "hover:scale-105 active:scale-95"
                )}
                onMouseDown={onStartListening}
                onMouseUp={onStopListening}
                onMouseLeave={onStopListening}
                onContextMenu={(e) => e.preventDefault()}
                onTouchStart={(e) => {
                    e.preventDefault(); // Prevent ghost clicks and scrolling
                    onStartListening();
                }}
                onTouchEnd={(e) => {
                    e.preventDefault();
                    onStopListening();
                }}
                onTouchCancel={(e) => {
                    e.preventDefault();
                    onStopListening();
                }}
            >
                <Mic className={cn("h-10 w-10 transition-transform", isListening && "scale-110")} />
            </Button>
        </div>
    );
};

export default AudioControls;
