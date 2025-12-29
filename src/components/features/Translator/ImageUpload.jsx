import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, ImageIcon, X, Loader2 } from "lucide-react";
import { processAndTranslateImage } from "@/services/imageTranslate";

const ImageUpload = ({ targetLang, onTranslationComplete, onClose }) => {
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Process and translate
    setIsProcessing(true);
    setError(null);

    const result = await processAndTranslateImage(file, targetLang);

    setIsProcessing(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.message && !result.originalText) {
      setError(result.message);
      return;
    }

    // Pass results back to parent
    onTranslationComplete({
      originalText: result.originalText,
      translatedText: result.translatedText,
      detectedLanguage: result.detectedLanguage
    });
  };

  const handleClear = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <Card className="border-dashed border-2 border-muted-foreground/25 bg-secondary/20 overflow-hidden">
      <CardContent className="p-4">
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!preview ? (
          /* Upload buttons */
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 h-12 px-6"
              >
                <ImageIcon className="h-5 w-5" />
                Upload Image
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => cameraInputRef.current?.click()}
                className="gap-2 h-12 px-6"
              >
                <Camera className="h-5 w-5" />
                Take Photo
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload or capture an image with text to translate
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        ) : (
          /* Preview and processing state */
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full max-h-64 object-contain rounded-lg"
            />
            
            {/* Processing overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Extracting text...</p>
                </div>
              </div>
            )}

            {/* Error state */}
            {error && !isProcessing && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
                <div className="flex flex-col items-center gap-3 text-center px-4">
                  <p className="text-sm text-destructive font-medium">{error}</p>
                  <Button variant="outline" size="sm" onClick={handleClear}>
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Clear button */}
            {!isProcessing && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ImageUpload;

