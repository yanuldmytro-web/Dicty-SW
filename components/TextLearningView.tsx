import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { WordEntry, Category } from '../types';
import { fetchWordDetails, WordDetailsResponse } from '../services/geminiService';
import { PlusIcon } from './icons/PlusIcon';
import { PlayIcon } from './icons/PlayIcon';
import { StopIcon } from './icons/StopIcon';
import { BookmarkIcon } from './icons/BookmarkIcon';

interface TextLearningViewProps {
  words: WordEntry[];
  onWordsAdded: (words: WordEntry[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  playbackSpeed: number;
  onPlaybackSpeedChange: (speed: number) => void;
  title: string;
  onTitleChange: (title: string) => void;
  content: string;
  onContentChange: (text: string) => void;
  onSaveText: () => void;
  isTextSaved: boolean;
  allCategories: Category[];
}

interface TextPart {
    text: string;
    startIndex: number;
    isWord: boolean;
}

export const TextLearningView: React.FC<TextLearningViewProps> = ({
  words,
  onWordsAdded,
  isLoading,
  setIsLoading,
  setError,
  playbackSpeed,
  onPlaybackSpeedChange,
  title,
  onTitleChange,
  content,
  onContentChange,
  onSaveText,
  isTextSaved,
  allCategories
}) => {
  const [selection, setSelection] = useState<{ text: string; top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<number | null>(null);
  
  useEffect(() => {
    // Cleanup speechSynthesis on component unmount
    return () => {
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
  
  const textParts = useMemo<TextPart[]>(() => {
    if (!content) return [];
    const parts: TextPart[] = [];
    let currentIndex = 0;
    // Split by any sequence of whitespace or punctuation, keeping the delimiters
    const regex = /(\s+|[.,!?;:"()«»“”]+)/g;
    content.split(regex).forEach(part => {
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
  }, [content]);


  const renderedText = useMemo(() => {
    if (textParts.length === 0) return null;
    
    return textParts.map((part, index) => {
        const lowerCasePart = part.text.trim().toLowerCase();
        const knownWordEntry = part.isWord ? knownWords.get(lowerCasePart) : null;
        
        const isHighlighted = index === highlightedWordIndex;

        if (isHighlighted) {
            return (
                <span key={index} className="bg-yellow-300 dark:bg-yellow-500 text-slate-900 rounded-sm px-0.5 py-0.5">
                    {part.text}
                </span>
            );
        }

        if (knownWordEntry) {
            const posId = partOfSpeechCategoryMap[knownWordEntry.partOfSpeech.toLowerCase()];
            const category = allCategories.find(c => c.id === posId);
            const style = category?.color ? { backgroundColor: category.color, color: category.textColor } : {};
            const defaultClass = !category?.color ? 'bg-cyan-500/20 dark:bg-cyan-800/60' : '';

            return (
              <span key={index} className={`rounded px-1 py-0.5 cursor-pointer relative group ${defaultClass}`} style={style}>
                {part.text}
                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-xs px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {knownWordEntry.ukrainian}
                </span>
              </span>
            );
        }

        // Render newlines correctly
        if (part.text.includes('\n')) {
            return part.text.split(/(\n)/g).map((linePart, i) => 
                linePart === '\n' ? <br key={`${index}-${i}`} /> : <span key={`${index}-${i}`}>{linePart}</span>
            );
        }

        return <span key={index}>{part.text}</span>;
    });
  }, [textParts, knownWords, allCategories, highlightedWordIndex]);
  
  const speak = (textToSpeak: string, rate: number) => {
    if (!('speechSynthesis' in window)) {
        setError("Ваш браузер не підтримує синтез мовлення.");
        return;
    }
    
    window.speechSynthesis.cancel();

    const trimmedText = textToSpeak.trim();
    if (!trimmedText) {
        setIsSpeaking(false);
        setHighlightedWordIndex(null);
        return;
    }
    
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(trimmedText);
    utterance.lang = 'sv-SE';
    utterance.rate = rate;

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
    
    utterance.onend = () => {
        setIsSpeaking(false);
        setHighlightedWordIndex(null);
    };

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        if (event.error === 'canceled' || event.error === 'interrupted') {
            console.warn(`SpeechSynthesis utterance ${event.error}. This is usually not a problem.`);
            setIsSpeaking(false);
            setHighlightedWordIndex(null);
            return;
        }
    
        console.error("SpeechSynthesis Error:", event.error, event);
        
        let userMessage: string;
        switch (event.error) {
            case 'language-unavailable':
                userMessage = "Шведська мова недоступна для синтезу мовлення у вашому браузері. Перевірте налаштування системи.";
                break;
            case 'synthesis-failed':
                userMessage = "Не вдалося синтезувати мовлення. Сервіс вашого браузера чи ОС може бути тимчасово недоступний.";
                break;
            case 'not-allowed':
                 userMessage = "Браузер заблокував відтворення аудіо. Спробуйте ще раз після взаємодії зі сторінкою.";
                 break;
            case 'text-too-long':
                 userMessage = "Текст занадто довгий для озвучування. Будь ласка, спробуйте з коротшим фрагментом.";
                 break;
            case 'voice-unavailable':
                userMessage = "Голос для шведської мови недоступний. Перевірте налаштування системи.";
                break;
            default:
                 userMessage = `Виникла невідома помилка озвучування: ${event.error}.`;
        }
        
        setError(userMessage);
        setIsSpeaking(false);
        setHighlightedWordIndex(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleToggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setHighlightedWordIndex(null);
    } else if (content.trim()) {
      speak(content, playbackSpeed);
    }
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(e.target.value);
    onPlaybackSpeedChange(newSpeed);
    if (isSpeaking) {
      speak(content, newSpeed);
    }
  };

  const handleMouseUp = () => {
    const currentSelection = window.getSelection();
    if (currentSelection && currentSelection.toString().trim().length > 0 && !isLoading) {
      const selectedText = currentSelection.toString().trim().replace(/^[.,!?;:"()«»“”]+|[.,!?;:"()«»“”]+$/gu, '');
      
      if (!selectedText || knownWords.has(selectedText.toLowerCase())) {
        setSelection(null);
        return;
      }

      const range = currentSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = displayRef.current?.getBoundingClientRect();

      if (containerRect && rect.top >= containerRect.top && rect.bottom <= containerRect.bottom) {
        setSelection({
          text: selectedText,
          top: rect.bottom - containerRect.top + 8,
          left: rect.left - containerRect.left + rect.width / 2,
        });
        return;
      }
    }
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setSelection(null);
      }
    };
    if (selection) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selection]);

  const handleAddWord = async () => {
    if (!selection) return;

    const wordToAdd = selection.text;
    setIsLoading(true);
    setError(null);
    setSelection(null);

    try {
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

  return (
    <div className="space-y-6">
      <div className="space-y-4 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <div>
            <label htmlFor="title-input" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
            Назва
            </label>
            <input
                id="title-input"
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Введіть назву для вашого тексту..."
                className="w-full bg-slate-100 dark:bg-slate-900/70 p-3 rounded-lg focus:ring-2 focus:ring-cyan-500 transition-shadow focus:outline-none placeholder-slate-400 dark:placeholder-slate-500"
                disabled={isLoading}
            />
        </div>
        <div>
            <label htmlFor="text-input" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
            Вставте ваш текст шведською
            </label>
            <textarea
            id="text-input"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Skriv eller klistra in din svenska text här..."
            className="w-full h-40 bg-slate-100 dark:bg-slate-900/70 p-3 rounded-lg focus:ring-2 focus:ring-cyan-500 transition-shadow focus:outline-none placeholder-slate-400 dark:placeholder-slate-500"
            disabled={isLoading}
            />
        </div>
      </div>


      <div className="flex items-center justify-between gap-4 p-3 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <button
          onClick={handleToggleSpeech}
          disabled={!content.trim() || isLoading}
          className="flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold p-3 rounded-md transition-colors"
          aria-label={isSpeaking ? "Зупинити озвучування" : "Озвучити текст"}
        >
          {isSpeaking ? (
            <StopIcon className="w-5 h-5" />
          ) : (
            <PlayIcon className="w-5 h-5" />
          )}
        </button>
        <div className="flex items-center gap-3 flex-grow">
          <label htmlFor="speed-control" className="text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
            Швидкість:
          </label>
          <input
            id="speed-control"
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
        <button
          onClick={onSaveText}
          disabled={!title.trim() || !content.trim() || isTextSaved || isLoading}
          className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:bg-slate-200/50 dark:disabled:bg-slate-600/50 disabled:text-slate-400 dark:disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 dark:text-white font-bold px-4 py-3 rounded-md transition-colors whitespace-nowrap"
          aria-label={isTextSaved ? "Текст збережено" : "Зберегти текст"}
        >
          <BookmarkIcon className="w-5 h-5" />
          <span>{isTextSaved ? 'Збережено' : 'Зберегти'}</span>
        </button>
      </div>

      <div className="relative bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg min-h-[200px]" ref={displayRef} onMouseUp={handleMouseUp}>
        {content ? (
          <div className="text-slate-700 dark:text-slate-300 select-text text-lg leading-relaxed">{renderedText}</div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
            <p>Ваш текст з'явиться тут з підсвіченими словами.</p>
          </div>
        )}

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
              className="flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 text-white font-bold p-2 rounded-md transition-colors"
              aria-label={`Додати слово ${selection.text} до словника`}
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};