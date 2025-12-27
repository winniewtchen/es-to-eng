import { useState, useEffect } from 'react';

export function useVocabulary() {
    const [vocab, setVocab] = useState([]);

    useEffect(() => {
        const stored = localStorage.getItem('rapido_vocab_v1');
        if (stored) setVocab(JSON.parse(stored));
    }, []);

    const savePhrase = (original, translated) => {
        if (!original || !translated) return;
        const newItem = {
            id: Date.now(),
            original,
            translated,
            date: new Date().toISOString()
        };
        const updated = [newItem, ...vocab];
        setVocab(updated);
        localStorage.setItem('rapido_vocab_v1', JSON.stringify(updated));
    };

    const deletePhrase = (id) => {
        const updated = vocab.filter(item => item.id !== id);
        setVocab(updated);
        localStorage.setItem('rapido_vocab_v1', JSON.stringify(updated));
    }

    return { vocab, savePhrase, deletePhrase };
}
