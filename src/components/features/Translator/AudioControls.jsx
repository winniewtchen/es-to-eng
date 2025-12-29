import React from "react";
import VoiceIntensityVisual from "@/components/features/Translator/VoiceIntensityVisual";

const AudioControls = ({ isListening, onStartListening, onStopListening }) => {
    return (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center p-4 gradient-mask-t pointer-events-none">
            <VoiceIntensityVisual
                isListening={isListening}
                onStart={onStartListening}
                onStop={onStopListening}
            />
        </div>
    );
};

export default AudioControls;
