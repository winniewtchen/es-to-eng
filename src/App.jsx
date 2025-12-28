import { useState, useEffect, useRef } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import InputArea from '@/components/features/Translator/InputArea'
import OutputArea from '@/components/features/Translator/OutputArea'
import AudioControls from '@/components/features/Translator/AudioControls'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { translateText } from '@/services/llm'
import { detectLanguage } from '@/services/detectLanguage'
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
    // If we just stopped listening and have text, translate immediately
    // Note: isListening logic in hook updates state.
    // We check if we are NOT listening, but we *were* (implied by content change or external tracker?).
    // Simplification: If transcript updates and we are NOT listening (anymore), valid. 
    // But transcript updates only during listening usually.
    // Better: trigger when isListening goes false.
  }, []); // Logic is tricky in useEffect deps.

  // Let's use a ref to track previous listening state or just use the dependency on isListening
  useEffect(() => {
    if (!isListening && transcript) {
      handleTranslate(transcript);
    }
  }, [isListening]); // trigger when isListening changes to false

  // Manual debounced translate for typing
  useEffect(() => {
    if (isListening) return;
    const timer = setTimeout(() => {
      if (inputText && inputText.length > 2) {
        // Only auto-translate if not recently spoken? 
        // Simplification: just translate what's there.
        // But we don't want to re-translate the same thing constantly if it hasn't changed.
        // We rely on stable inputText.
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
      // Reset after one detection cycle
      manualOverrideRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      const result = await detectLanguage(inputText);
      if (!result || result.confidence < 0.5) return;

      // Normalize detected language (e.g., 'zh-CN' -> 'zh', 'en-US' -> 'en')
      let detected = result.language;
      if (detected.startsWith('zh')) detected = 'zh';
      else if (detected.startsWith('en')) detected = 'en';
      else if (detected.startsWith('es')) detected = 'es';

      const currentSourceCode = LANGUAGES[sourceLang].code;

      // Only update if detected language is different from current source
      if (detected === currentSourceCode) return;

      // Find the source key for detected language
      const newSourceKey = Object.keys(LANGUAGES).find(
        key => LANGUAGES[key].code === detected
      );
      if (!newSourceKey) return; // Unknown language, skip

      // Update source language
      setSourceLang(newSourceKey);

      // Auto-set target based on rules:
      // English or Chinese -> Spanish
      // Spanish -> English
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

  // Handle source language change - ensure target is different
  const handleSourceChange = (newSource) => {
    manualOverrideRef.current = true; // User manually changed, skip next auto-detect
    setSourceLang(newSource);
    const newSourceCode = LANGUAGES[newSource].code;
    // If target matches new source, switch target to something else
    if (targetLang === newSourceCode) {
      // Pick first available language that's different
      const available = Object.values(LANGUAGES).find(l => l.code !== newSourceCode);
      setTargetLang(available.code);
    }
    // Clear current text when switching
    setInputText('');
    setTranslation('');
  };

  // Handle target language change
  const handleTargetChange = (newTarget) => {
    setTargetLang(newTarget);
    // Retranslate if there's text
    if (inputText && inputText.length > 2) {
      handleTranslate(inputText);
    }
  };

  const handleSwapLanguages = () => {
    // Find the source key that matches current target code
    const newSourceKey = Object.keys(LANGUAGES).find(
      key => LANGUAGES[key].code === targetLang
    );
    const newTargetCode = LANGUAGES[sourceLang].code;

    setSourceLang(newSourceKey);
    setTargetLang(newTargetCode);

    // Swap text
    const currentInput = inputText;
    const currentTranslation = translation;
    setInputText(currentTranslation);
    setTranslation(currentInput);
  };

  // Get available target languages (exclude source)
  const getAvailableTargets = () => {
    const sourceCode = LANGUAGES[sourceLang].code;
    return Object.values(LANGUAGES).filter(l => l.code !== sourceCode);
  };



  return (
    <MainLayout headerRight={<VocabSheet vocab={vocab} onDelete={deletePhrase} />}>
      <div className="flex-1 flex flex-col gap-6 pb-24">
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
        />
        <div onClick={() => savePhrase(inputText, translation)} className="cursor-pointer">
          <OutputArea translation={translation} isTranslating={isTranslating} targetLang={targetLang} />
        </div>
      </div>
      <AudioControls
        isListening={isListening}
        onStartListening={startListening}
        onStopListening={stopListening}
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
