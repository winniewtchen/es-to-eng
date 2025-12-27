import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Settings } from "lucide-react"

const SettingsSheet = () => {
    const [apiKey, setApiKey] = useState("");

    useEffect(() => {
        const stored = localStorage.getItem('rapido_api_key') || import.meta.env.VITE_OPENAI_API_KEY;
        if (stored) setApiKey(stored);
    }, []);

    const handleSave = () => {
        localStorage.setItem('rapido_api_key', apiKey);
        alert("API Key Saved");
    };

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left">
                <SheetHeader>
                    <SheetTitle>Settings</SheetTitle>
                    <SheetDescription>
                        Configure your translation provider.
                    </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="apikey" className="text-right">
                            API Key
                        </Label>
                        <Input
                            id="apikey"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="col-span-3"
                            placeholder="OpenAI Key"
                            type="password"
                        />
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSave}>Save changes</Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default SettingsSheet;
