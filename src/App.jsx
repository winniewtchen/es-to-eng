import { useState, useEffect } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import InputArea from '@/components/features/Translator/InputArea'
import OutputArea from '@/components/features/Translator/OutputArea'
import AudioControls from '@/components/features/Translator/AudioControls'
import SettingsSheet from '@/components/features/Settings/SettingsSheet'
import { useSpeechToText } from '@/hooks/useSpeechToText'
import { translateText } from '@/services/llm'
import { useVocabulary } from '@/hooks/useVocabulary'
import { Button } from '@/components/ui/button'
import { Book, ArrowRightLeft } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

function App() {
  const [inputText, setInputText] = useState("")
  const [translation, setTranslation] = useState("")
  const [isTranslating, setIsTranslating] = useState(false)
  const [sourceLang, setSourceLang] = useState('en-US') // 'en-US' or 'es-MX'
  const [targetLang, setTargetLang] = useState('es')    // 'es' or 'en'


  const { isListening, transcript, startListening, stopListening, interimTranscript } = useSpeechToText(sourceLang);
  const { savePhrase, vocab, deletePhrase } = useVocabulary();

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
  }, [inputText, isListening]);

  const handleTranslate = async (text) => {
    if (!text || text.length < 2) return;
    setIsTranslating(true);
    const apiKey = localStorage.getItem('rapido_api_key') || import.meta.env.VITE_OPENAI_API_KEY;
    const result = await translateText(text, targetLang, apiKey);
    setTranslation(result);
    setIsTranslating(false);
  };

  const handleSwapLanguages = () => {
    if (sourceLang === 'en-US') {
      setSourceLang('es-MX');
      setTargetLang('en');
    } else {
      setSourceLang('en-US');
      setTargetLang('es');
    }
    // Swap text if any
    const currentInput = inputText;
    const currentTranslation = translation;
    setInputText(currentTranslation);
    setTranslation(currentInput);
  };



  return (
    <MainLayout headerRight={<div className="flex gap-2"><SettingsSheet /><VocabSheet vocab={vocab} onDelete={deletePhrase} /></div>}>
      <div className="flex-1 flex flex-col gap-6 pb-24">
        <div className="flex items-center justify-between px-4">
          <span className="text-sm font-medium text-muted-foreground">{sourceLang === 'en-US' ? 'English' : 'Spanish'}</span>
          <Button variant="ghost" size="icon" onClick={handleSwapLanguages} className="rounded-full hover:bg-muted">
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground">{targetLang === 'es' ? 'Spanish' : 'English'}</span>
        </div>

        <InputArea
          value={isListening ? (inputText + (interimTranscript ? ' ' + interimTranscript : '')) : inputText}
          onChange={setInputText}
          placeholder={isListening ? "Listening..." : "Type here..."}
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
