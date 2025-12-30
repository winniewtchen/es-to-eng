import { useState, useEffect, useRef } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import InputArea from '@/components/features/Translator/InputArea'
import OutputArea from '@/components/features/Translator/OutputArea'
import BottomControls from '@/components/features/Translator/BottomControls'
import ImageTranslationView from '@/components/features/Translator/ImageTranslationView'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { translateText } from '@/services/llm'
import { detectLanguage } from '@/services/detectLanguage'
import { processAndTranslateImage } from '@/services/imageTranslate'
import { useVocabulary } from '@/hooks/useVocabulary'
import { Button } from '@/components/ui/button'
import { Book, ArrowRightLeft } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

// Language configuration
const LANGUAGES = {
  'en-US': { label: 'English', code: 'en', speechLang: 'en-US' },
  'es-MX': { label: 'Spanish', code: 'es', speechLang: 'es-MX' },
  'zh-CN': { label: '中文', code: 'zh', speechLang: 'zh-CN' }
};

function App() {
  const [inputText, setInputText] = useState("")
  const [translation, setTranslation] = useState("")
  const [isTranslating, setIsTranslating] = useState(false)
  const [sourceLang, setSourceLang] = useState('en-US') // 'en-US', 'es-MX', or 'zh-CN'
  const [targetLang, setTargetLang] = useState('es')    // 'es', 'en', or 'zh'
  
  // Image Mode State
  const [translationMode, setTranslationMode] = useState('text') // 'text' | 'image'
  const [imageState, setImageState] = useState({
    url: null,
    file: null,
    translationData: null,
    isProcessing: false
  })
  const fileInputRef = useRef(null)

  const { isListening, transcript, startListening, stopListening, interimTranscript } = useSpeechToText(sourceLang);
  const { savePhrase, vocab, deletePhrase } = useVocabulary();

  // Track if user manually changed language (skip auto-detect temporarily)
  const manualOverrideRef = useRef(false);

  // Sync speech transcript to input
  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  // Handle listening end auto-translate
  useEffect(() => {
    if (!isListening && transcript) {
      handleTranslate(transcript);
    }
  }, [isListening]); 

  // Manual debounced translate for typing
  useEffect(() => {
    if (isListening) return;
    const timer = setTimeout(() => {
      if (inputText && inputText.length > 2) {
        handleTranslate(inputText);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [inputText, isListening, sourceLang, targetLang]);

  // Auto-detect language and update source/target accordingly
  useEffect(() => {
    const isChinese = /[\u4e00-\u9fa5]/.test(inputText);
    if (isListening || !inputText || (!isChinese && inputText.length < 2)) return;
    if (manualOverrideRef.current) {
      manualOverrideRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      const result = await detectLanguage(inputText);
      if (!result || result.confidence < 0.5) return;

      let detected = result.language;
      if (detected.startsWith('zh')) detected = 'zh';
      else if (detected.startsWith('en')) detected = 'en';
      else if (detected.startsWith('es')) detected = 'es';

      const currentSourceCode = LANGUAGES[sourceLang].code;

      if (detected === currentSourceCode) return;

      const newSourceKey = Object.keys(LANGUAGES).find(
        key => LANGUAGES[key].code === detected
      );
      if (!newSourceKey) return;

      setSourceLang(newSourceKey);

      if (detected === 'en' || detected === 'zh') {
        setTargetLang('es');
      } else if (detected === 'es') {
        setTargetLang('en');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [inputText, isListening, sourceLang]);

  const handleTranslate = async (text) => {
    if (!text || text.length < 2) return;
    setIsTranslating(true);
    const result = await translateText(text, targetLang);
    setTranslation(result);
    setIsTranslating(false);
  };

  const handleSourceChange = (newSource) => {
    manualOverrideRef.current = true;
    setSourceLang(newSource);
    const newSourceCode = LANGUAGES[newSource].code;
    if (targetLang === newSourceCode) {
      const available = Object.values(LANGUAGES).find(l => l.code !== newSourceCode);
      setTargetLang(available.code);
    }
    setInputText('');
    setTranslation('');
  };

  const handleTargetChange = (newTarget) => {
    setTargetLang(newTarget);
    if (inputText && inputText.length > 2) {
      handleTranslate(inputText);
    }
  };

  const handleSwapLanguages = () => {
    const newSourceKey = Object.keys(LANGUAGES).find(
      key => LANGUAGES[key].code === targetLang
    );
    const newTargetCode = LANGUAGES[sourceLang].code;

    setSourceLang(newSourceKey);
    setTargetLang(newTargetCode);

    const currentInput = inputText;
    const currentTranslation = translation;
    setInputText(currentTranslation);
    setTranslation(currentInput);
  };

  const getAvailableTargets = () => {
    const sourceCode = LANGUAGES[sourceLang].code;
    return Object.values(LANGUAGES).filter(l => l.code !== sourceCode);
  };

  // Image Translation Handlers
  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Switch to image mode immediately with loading state
    setTranslationMode('image');
    setImageState({
      url: URL.createObjectURL(file),
      file: file,
      translationData: null,
      isProcessing: true
    });

    try {
      const result = await processAndTranslateImage(file, targetLang);
      
      setImageState(prev => ({
        ...prev,
        translationData: result,
        isProcessing: false
      }));

      // Auto-detect language update if needed
      if (result.detectedLanguage) {
        let detected = result.detectedLanguage;
        if (detected.startsWith('zh')) detected = 'zh';
        else if (detected.startsWith('en')) detected = 'en';
        else if (detected.startsWith('es')) detected = 'es';

        const newSourceKey = Object.keys(LANGUAGES).find(
          key => LANGUAGES[key].code === detected
        );
        if (newSourceKey && newSourceKey !== sourceLang) {
          setSourceLang(newSourceKey);
        }
      }

    } catch (error) {
      console.error("Image translation error:", error);
      setImageState(prev => ({
        ...prev,
        isProcessing: false,
        translationData: { error: "Failed to process image" }
      }));
    }
  };

  const handleCloseImageMode = () => {
    setTranslationMode('text');
    setImageState({
      url: null,
      file: null,
      translationData: null,
      isProcessing: false
    });
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageLanguageChange = async (newTarget) => {
    setTargetLang(newTarget);
    
    if (imageState.file) {
      setImageState(prev => ({ ...prev, isProcessing: true }));
      try {
        const result = await processAndTranslateImage(imageState.file, newTarget);
        setImageState(prev => ({
          ...prev,
          translationData: result,
          isProcessing: false
        }));
      } catch (error) {
        console.error("Image re-translation error:", error);
        setImageState(prev => ({
          ...prev,
          isProcessing: false,
          translationData: { error: "Failed to process image" }
        }));
      }
    }
  };

  return (
    <MainLayout headerRight={<VocabSheet vocab={vocab} onDelete={deletePhrase} />}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        // capture="environment" // Optional: force rear camera on mobile
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex-1 flex flex-col gap-6 pb-24 h-full">
        {translationMode === 'text' ? (
          <>
            <div className="flex items-center justify-between px-4">
              <select
                value={sourceLang}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="text-sm font-medium bg-transparent text-foreground border border-border rounded-md px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.entries(LANGUAGES).map(([key, lang]) => (
                  <option key={key} value={key}>{lang.label}</option>
                ))}
              </select>
              <Button variant="ghost" size="icon" onClick={handleSwapLanguages} className="rounded-full hover:bg-muted">
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
              <select
                value={targetLang}
                onChange={(e) => handleTargetChange(e.target.value)}
                className="text-sm font-medium bg-transparent text-foreground border border-border rounded-md px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {getAvailableTargets().map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>
            </div>

            <InputArea
              value={isListening ? (inputText + (interimTranscript ? ' ' + interimTranscript : '')) : inputText}
              onChange={setInputText}
              placeholder={isListening ? "Listening..." : "Type here..."}
              onSubmit={() => handleTranslate(inputText)}
              lang={sourceLang}
              // Camera button removed from InputArea, now in BottomControls
            />
            
            <div onClick={() => savePhrase(inputText, translation)} className="cursor-pointer">
              <OutputArea translation={translation} isTranslating={isTranslating} targetLang={targetLang} />
            </div>
          </>
        ) : (
          <ImageTranslationView 
            imageUrl={imageState.url}
            translationData={imageState.translationData}
            isProcessing={imageState.isProcessing}
            onClose={handleCloseImageMode}
            targetLang={targetLang}
            onLanguageChange={handleImageLanguageChange}
            languages={LANGUAGES}
          />
        )}
      </div>

      <BottomControls
        isListening={isListening}
        onStartListening={startListening}
        onStopListening={stopListening}
        onCameraClick={handleCameraClick}
      />
    </MainLayout>
  )
}

const VocabSheet = ({ vocab, onDelete }) => (
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="ghost" size="icon"><Book className="h-5 w-5" /></Button>
    </SheetTrigger>
    <SheetContent>
      <SheetHeader><SheetTitle>Vocabulary</SheetTitle></SheetHeader>
      <div className="flex flex-col gap-4 mt-4 overflow-y-auto h-full pb-20">
        {vocab.length === 0 && <p className="text-muted-foreground text-center">No saved phrases.</p>}
        {vocab.map(item => (
          <div key={item.id} className="p-3 border rounded-lg relative group">
            <p className="font-medium text-lg">{item.translated}</p>
            <p className="text-sm text-muted-foreground">{item.original}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 absolute top-2 right-2 opacity-50 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            >
              <span className="text-xs">✕</span>
            </Button>
          </div>
        ))}
      </div>
    </SheetContent>
  </Sheet>
);

export default App
