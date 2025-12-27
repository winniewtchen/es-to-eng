import React from 'react';
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { CornerDownLeft, Volume2 } from "lucide-react"
import { useTextToSpeech } from "@/hooks/useTextToSpeech"

const InputArea = ({ value, onChange, placeholder, onSubmit, lang }) => {
    const { speak } = useTextToSpeech();

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit?.();
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 sr-only">
                Input
            </label>
            <div className="relative">
                <Textarea
                    placeholder={placeholder || "Type here..."}
                    className="min-h-[120px] text-lg sm:text-xl resize-none bg-secondary/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50 pr-12 pb-12"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onDoubleClick={() => speak(value, lang)}
                    autoFocus
                />

                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => speak(value, lang)}
                    title="Listen"
                >
                    <Volume2 className="h-4 w-4" />
                </Button>

                <Button
                    size="icon"
                    className="absolute bottom-3 right-3 h-8 w-8 rounded-full shadow-sm"
                    onClick={onSubmit}
                    title="Translate"
                >
                    <CornerDownLeft className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export default InputArea;
