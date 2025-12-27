import React from 'react';
import { Textarea } from "@/components/ui/textarea"

const InputArea = ({ value, onChange, placeholder }) => {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 sr-only">
                English Input
            </label>
            <Textarea
                placeholder={placeholder || "Type here..."}
                className="min-h-[120px] text-lg sm:text-xl resize-none bg-secondary/30 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoFocus
            />
        </div>
    );
};

export default InputArea;
