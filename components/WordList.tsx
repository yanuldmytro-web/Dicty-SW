import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { WordEntry, Category, Example } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { SpeakerIcon } from './icons/SpeakerIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { fetchWordDetails, WordDetailsResponse } from '../services/geminiService';
import { PlusIcon } from './icons/PlusIcon';
import { CategorySidebar } from './CategorySidebar';
import { StopIcon } from './icons/StopIcon';

interface WordListProps {
  words: WordEntry[];
  onDeleteWord: (id: string) => void;
  onUpdateWordCategories: (wordId: string, categoryIds: string[]) => void;
  onFetchNewExample: (id: string) => Promise<void>;
  playbackSpeed: number;
  onPlaybackSpeedChange: (speed: number) => void;
  onWordsAdded: (words: WordEntry[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  partOfSpeechCategories: Category[];
  thematicCategories: Category[];
  onAddCategory: (name: string, imageUrl: string) => void;
  onUpdateCategory: (id: string, name: string, imageUrl: string) => void;
}

interface TextPart {
  text: string;
  startIndex: number;
  isWord: boolean;
}

export const WordList: React.FC<WordListProps> = ({ 
    words, 
    onDeleteWord,
    onUpdateWordCategories, 
    onFetchNewExample, 
    playbackSpeed, 
    onPlaybackSpeedChange,
    onWordsAdded,
    isLoading,
    setIsLoading,
    setError,
    partOfSpeechCategories,
    thematicCategories,
    onAddCategory,
    onUpdateCategory
}) => {
  const [loadingExamples, setLoadingExamples] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState<{ text: string; top: number; left: number } | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  
  const [speakingExampleId, setSpeakingExampleId] = useState<string | null>(null);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<number | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const categoryEditorRef = useRef<HTMLDivElement>(null);

  const allCategories = useMemo(() => [...partOfSpeechCategories, ...thematicCategories], [partOfSpeechCategories, thematicCategories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
            setSelection(null);
        }
        if (categoryEditorRef.current && !categoryEditorRef.current.contains(event.target as Node)) {
            setEditingWordId(null);
        }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        if (window.speechSynthesis?.speaking) {
            window.speechSynthesis.cancel();
        }
    };
  }, []);

  const knownWords = useMemo(() => {
    const wordMap = new Map<string, WordEntry>();
    words.forEach(word => {
      wordMap.set(word.swedish.toLowerCase(), word);
    });
    return wordMap;
  }, [words]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const word of words) {
        for (const categoryId of word.categoryIds) {
            counts.set(categoryId, (counts.get(categoryId) || 0) + 1);
        }
    }
    return counts;
  }, [words]);

  const filteredWords = useMemo(() => {
    if (!activeCategoryId) {
        return words.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
    }
    return words.filter(word => word.categoryIds.includes(activeCategoryId)).sort((a,b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
  }, [words, activeCategoryId]);

  const parseText = (text: string): TextPart[] => {
      if (!text) return [];
      const parts: TextPart[] = [];
      let currentIndex = 0;
      // Split by any sequence of whitespace or punctuation, keeping the delimiters
      const regex = /(\s+|[.,!?;:"()«»“”]+)/g;
      text.split(regex).forEach(part => {
          if (part) {
              parts.push({
                  text: part,
                  startIndex: currentIndex,
                  isWord: !regex.test(part) && part.trim().length > 0,
              });
              currentIndex += part.length;
          }
      });
      return parts;
    };

  const speak = (text: string, lang: string = 'sv-SE', exampleId: string | null = null) => {
    if (!('speechSynthesis' in window)) {
      setError('Ваш браузер не підтримує синтез мовлення.');
      return;
    }
  
    window.speechSynthesis.cancel();
  
    // If the same example's button is clicked again, it acts as a stop button.
    if (exampleId && speakingExampleId === exampleId) {
      setSpeakingExampleId(null);
      setHighlightedWordIndex(null);
      return;
    }
    
    // Clear previous state before starting new speech
    setSpeakingExampleId(null);
    setHighlightedWordIndex(null);
  
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = playbackSpeed;
  
    let textParts: TextPart[] = [];
    if (exampleId) {
      textParts = parseText(text);
      setSpeakingExampleId(exampleId);
  
      utterance.onboundary = (event) => {
        const charIndex = event.charIndex;
        const wordIndex = textParts.findIndex(part =>
          part.isWord &&
          charIndex >= part.startIndex &&
          charIndex < (part.startIndex + part.text.length)
        );
        if (wordIndex !== -1) {
          setHighlightedWordIndex(wordIndex);
        }
      };
    }
  
    utterance.onend = () => {
      setSpeakingExampleId(null);
      setHighlightedWordIndex(null);
    };
  
    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        if (event.error === 'canceled' || event.error === 'interrupted') {
            console.warn(`SpeechSynthesis utterance ${event.error}. This is usually not a problem.`);
        } else {
            console.error("SpeechSynthesis Error:", event.error, event);
            setError(`Виникла помилка озвучування: ${event.error}.`);
        }
        setSpeakingExampleId(null);
        setHighlightedWordIndex(null);
    };
  
    window.speechSynthesis.speak(utterance);
  };

  const handleFetchExampleClick = async (wordId: string) => {
    setLoadingExamples(prev => new Set(prev).add(wordId));
    try {
        await onFetchNewExample(wordId);
    } catch (error) {
        console.error("Failed to fetch new example", error);
    } finally {
        setLoadingExamples(prev => {
            const next = new Set(prev);
            next.delete(wordId);
            return next;
        });
    }
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPlaybackSpeedChange(parseFloat(e.target.value));
  };
  
  const handleMouseUp = () => {
    if (isLoading) return;
    const currentSelection = window.getSelection();
    if (currentSelection && currentSelection.toString().trim().length > 0) {
      const selectedText = currentSelection.toString().trim().replace(/^[.,!?;:"()«»“”]+|[.,!?;:"()«»“”]+$/gu, '');
      
      if (!selectedText || knownWords.has(selectedText.toLowerCase())) {
        if (selection) setSelection(null);
        return;
      }

      const range = currentSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();

      if (containerRect) {
         if(rect.top >= containerRect.top && rect.bottom <= containerRect.bottom) {
             setSelection({
                text: selectedText,
                top: rect.bottom - containerRect.top + 8,
                left: rect.left - containerRect.left + rect.width / 2,
            });
            return;
        }
      }
    }
    
    if (selection) {
       setSelection(null);
    }
  };

  const handleAddWord = async () => {
    if (!selection) return;

    const wordToAdd = selection.text;
    setIsLoading(true);
    setError(null);
    setSelection(null);

    try {
      const partOfSpeechCategoryMap: { [key: string]: string } = {
        'іменник': 'nouns',
        'дієслово': 'verbs',
        'прикметник': 'adjectives',
        'прислівник': 'adverbs',
        'займенник': 'pronouns',
        'прийменник': 'prepositions',
        'сполучник': 'conjunctions',
        'числівник': 'numerals',
      };
      const detailsArray: WordDetailsResponse[] = await fetchWordDetails(wordToAdd);
      const newEntries: WordEntry[] = detailsArray.map(details => {
        const autoCategoryId = partOfSpeechCategoryMap[details.part_of_speech.toLowerCase()];
        const initialCategoryIds = autoCategoryId ? [autoCategoryId] : [];
        return {
          id: crypto.randomUUID(),
          swedish: wordToAdd,
          swedishDisplay: details.swedish_display_form,
          ukrainian: details.ukrainian_translation,
          partOfSpeech: details.part_of_speech,
          examples: [{
            id: crypto.randomUUID(),
            swedish: details.example_sentence_swedish,
            ukrainian: details.example_sentence_ukrainian,
          }],
          categoryIds: initialCategoryIds,
          dateAdded: new Date().toISOString(),
        };
      });
      onWordsAdded(newEntries);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChangeForWord = (wordId: string, categoryId: string, isChecked: boolean) => {
    const word = words.find(w => w.id === wordId);
    if (!word) return;
    
    const newCategoryIds = isChecked
      ? [...word.categoryIds, categoryId]
      : word.categoryIds.filter(id => id !== categoryId);
      
    onUpdateWordCategories(wordId, newCategoryIds);
  };

  const partOfSpeechCategoryMap: { [key: string]: string } = {
    'іменник': 'nouns',
    'дієслово': 'verbs',
    'прикметник': 'adjectives',
    'прислівник': 'adverbs',
    'займенник': 'pronouns',
    'прийменник': 'prepositions',
    'сполучник': 'conjunctions',
    'числівник': 'numerals',
  };

  const renderInteractiveSentence = (sentence: string, isCurrentlySpeaking: boolean) => {
    return parseText(sentence).map((part, partIndex) => {
        if (isCurrentlySpeaking && partIndex === highlightedWordIndex) {
            return (
                <span key={partIndex} className="bg-yellow-300 dark:bg-yellow-500 text-slate-900 rounded-sm px-0.5 py-0.5">
                    {part.text}
                </span>
            );
        }

        const lowerCasePart = part.text.trim().toLowerCase();
        const knownWordEntry = knownWords.get(lowerCasePart);

        if (knownWordEntry) {
            const posId = partOfSpeechCategoryMap[knownWordEntry.partOfSpeech.toLowerCase()];
            const category = allCategories.find(c => c.id === posId);
            const style = category?.color ? { backgroundColor: category.color, color: category.textColor } : {};
            const defaultClass = !category?.color ? 'bg-cyan-900/70' : '';
            
            return (
                <span key={partIndex} className={`rounded px-1 py-0.5 cursor-pointer relative group ${defaultClass}`} style={style}>
                    {part.text}
                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-xs px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {knownWordEntry.ukrainian}
                    </span>
                </span>
            );
        }
        return <span key={partIndex}>{part.text}</span>;
    });
  };

  if (words.length === 0) {
    return (
      <div className="text-center py-10 px-4 bg-slate-200/60 dark:bg-slate-800/50 rounded-lg">
        <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Ваш словник порожній</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Додайте нові слова, щоб почати вивчення.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8" ref={containerRef} onMouseUp={handleMouseUp}>
      <CategorySidebar 
        partOfSpeechCategories={partOfSpeechCategories}
        thematicCategories={thematicCategories}
        activeCategoryId={activeCategoryId}
        onSelectCategory={setActiveCategoryId}
        categoryCounts={categoryCounts}
        totalWordsCount={words.length}
        onAddCategory={onAddCategory}
        onUpdateCategory={onUpdateCategory}
      />
      <main className="lg:col-span-3 space-y-4 relative">
       <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg shadow">
          <label htmlFor="speed-control-list" className="text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
            Швидкість озвучування:
          </label>
          <input
            id="speed-control-list"
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={playbackSpeed}
            onChange={handleSpeedChange}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm font-mono text-cyan-500 dark:text-cyan-400 w-12 text-center">{playbackSpeed.toFixed(1)}x</span>
        </div>

      {filteredWords.map((word) => {
        const wordCategories = allCategories.filter(c => word.categoryIds.includes(c.id));
        return (
            <div key={word.id} className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow-lg relative transition-transform hover:scale-[1.01] hover:shadow-xl">
            <div className="absolute top-3 right-3 flex items-center gap-2">
                 <div className="relative" ref={editingWordId === word.id ? categoryEditorRef : null}>
                    <button 
                        onClick={() => setEditingWordId(prev => prev === word.id ? null : word.id)}
                        className="text-xs bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 hover:bg-slate-300 dark:hover:bg-slate-600"
                    >
                        Змінити категорії
                    </button>
                    {editingWordId === word.id && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-10 p-2 max-h-60 overflow-y-auto">
                            {thematicCategories.map(cat => (
                                <label key={cat.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={word.categoryIds.includes(cat.id)}
                                        onChange={(e) => handleCategoryChangeForWord(word.id, cat.id, e.target.checked)}
                                        className="h-4 w-4 rounded bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-500 text-cyan-600 focus:ring-cyan-500"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">{cat.name}</span>
                                 </label>
                            ))}
                        </div>
                    )}
                 </div>
                <button 
                    onClick={() => onDeleteWord(word.id)}
                    className="text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors p-1 rounded-full"
                    aria-label="Видалити слово"
                >
                    <TrashIcon className="w-5 h-5"/>
                </button>
            </div>
            
            <div className="flex items-start gap-3 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-cyan-500 dark:text-cyan-400">{word.swedishDisplay}</h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 italic -mt-1">{word.partOfSpeech}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                        {wordCategories.map(cat => {
                           const style = cat.color ? { backgroundColor: cat.color, color: cat.textColor } : {};
                           const defaultClass = !cat.color ? 'text-cyan-800 dark:text-cyan-200 bg-cyan-500/20 dark:bg-cyan-800/50' : '';
                           return (
                                <p key={cat.id} className={`text-xs font-medium inline-block px-2 py-0.5 rounded-full ${defaultClass}`} style={style}>
                                    {cat.name}
                                </p>
                           );
                        })}
                    </div>
                </div>
                <button onClick={() => speak(word.swedish)} aria-label="Озвучити шведське слово" className="text-slate-400 dark:text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors mt-1">
                    <SpeakerIcon className="w-6 h-6" />
                </button>
            </div>
            <p className="text-lg text-slate-700 dark:text-slate-300 mb-4">{word.ukrainian}</p>
            
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-2">Приклади:</h3>
                {word.examples.map((example) => {
                    const isSpeakingThisExample = speakingExampleId === example.id;
                    return (
                    <div key={example.id} className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-600 dark:text-slate-300 w-24 text-right shrink-0">Шведською:</span> 
                            <span className="flex-grow text-slate-500 dark:text-slate-400 select-text">{renderInteractiveSentence(example.swedish, isSpeakingThisExample)}</span>
                            <button onClick={() => speak(example.swedish, 'sv-SE', example.id)} aria-label={isSpeakingThisExample ? "Зупинити озвучування" : "Озвучити приклад"} className="text-slate-400 dark:text-slate-500 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors shrink-0">
                                {isSpeakingThisExample ? <StopIcon className="w-5 h-5"/> : <SpeakerIcon className="w-5 h-5" />}
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-600 dark:text-slate-300 w-24 text-right shrink-0">Українською:</span>
                            <span className="flex-grow text-slate-500 dark:text-slate-400">{example.ukrainian}</span>
                        </div>
                    </div>
                    );
                })}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button 
                onClick={() => handleFetchExampleClick(word.id)}
                disabled={loadingExamples.has(word.id)}
                className="flex items-center gap-2 text-sm text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-wait font-medium"
                >
                {loadingExamples.has(word.id) ? (
                    <>
                    <div className="w-4 h-4 border-2 border-t-transparent border-slate-400 rounded-full animate-spin"></div>
                    <span>Отримання прикладу...</span>
                    </>
                ) : (
                    <>
                    <RefreshIcon className="w-4 h-4" />
                    <span>Ще приклад</span>
                    </>
                )}
                </button>
            </div>
            </div>
        )
      })}
      
      {selection && (
          <div
            ref={popoverRef}
            className="absolute z-20 flex items-center gap-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl"
            style={{
              top: `${selection.top}px`,
              left: `${selection.left}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <span className="font-bold text-cyan-500 dark:text-cyan-400">{selection.text}</span>
            <button
              onClick={handleAddWord}
              disabled={isLoading}
              className="flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 text-white font-bold p-2 rounded-md transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
              aria-label={`Додати слово ${selection.text} до словника`}
            >
                <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        )}
        </main>
    </div>
  );
};