import React from 'react';
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Volume2, Star } from "lucide-react"
import { useTextToSpeech } from "@/hooks/useTextToSpeech"

const OutputArea = ({ translation, isTranslating, targetLang = 'es' }) => {
    const { speak } = useTextToSpeech();

    if (!translation && !isTranslating) return null;

    const handleSpeak = (e) => {
        e.stopPropagation(); // Prevent parent "save" click
        // Map short code to full locale for better TTS
        const localeMap = {
            'es': 'es-MX',
            'en': 'en-US',
            'zh': 'zh-CN'
        };
        const locale = localeMap[targetLang] || 'en-US';
        speak(translation, locale);
    };

    // Get language label
    const getLangLabel = () => {
        const labels = { 'es': 'Spanish', 'en': 'English', 'zh': '中文' };
        return labels[targetLang] || 'Translation';
    };

    return (
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {getLangLabel()}
                </span>
                <div className="flex gap-1">
                    {/* Visual hint for audio */}
                    {translation && !isTranslating && (
                        <Volume2 className="h-4 w-4 text-muted-foreground opacity-50" />
                    )}
                </div>
            </div>
            <Card className="border-none shadow-sm bg-primary text-primary-foreground">
                <CardContent className="p-6 relative">
                    {isTranslating ? (
                        <div className="h-6 w-3/4 bg-primary-foreground/20 animate-pulse rounded"></div>
                    ) : (
                        <p
                            className="text-2xl sm:text-3xl font-medium leading-tight cursor-pointer active:opacity-70 transition-opacity"
                            onClick={handleSpeak}
                            title="Click to listen"
                        >
                            {translation}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default OutputArea;
