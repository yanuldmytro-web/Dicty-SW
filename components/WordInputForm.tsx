import React, { useState } from 'react';
import { fetchWordDetails, WordDetailsResponse } from '../services/geminiService';
import type { WordEntry, Category } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

type PendingWord = Omit<WordEntry, 'id' | 'categoryIds' | 'dateAdded'>;

interface WordInputFormProps {
  onWordsAdded: (words: WordEntry[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  categories: Category[];
}

export const WordInputForm: React.FC<WordInputFormProps> = ({ onWordsAdded, isLoading, setIsLoading, setError, categories }) => {
  const [newWord, setNewWord] = useState('');
  const [pendingWords, setPendingWords] = useState<PendingWord[] | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const detailsArray: WordDetailsResponse[] = await fetchWordDetails(newWord.trim());
      setPendingWords(detailsArray.map(details => ({
        swedish: newWord.trim(),
        swedishDisplay: details.swedish_display_form,
        ukrainian: details.ukrainian_translation,
        partOfSpeech: details.part_of_speech,
        examples: [{
          id: crypto.randomUUID(),
          swedish: details.example_sentence_swedish,
          ukrainian: details.example_sentence_ukrainian,
        }],
      })));
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
  
  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategoryIds(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleConfirmSelection = () => {
    if (!pendingWords || pendingWords.length === 0) return;

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
    
    const newEntries: WordEntry[] = pendingWords.map(pWord => {
        const autoCategoryId = partOfSpeechCategoryMap[pWord.partOfSpeech.toLowerCase()];
        const finalCategoryIds = new Set(selectedCategoryIds);
        if (autoCategoryId) {
            finalCategoryIds.add(autoCategoryId);
        }

        return {
            ...pWord,
            id: crypto.randomUUID(),
            categoryIds: Array.from(finalCategoryIds),
            dateAdded: new Date().toISOString(),
        };
    });

    onWordsAdded(newEntries);
    setNewWord('');
    setPendingWords(null);
    setSelectedCategoryIds([]);
  }

  const handleCancel = () => {
    setPendingWords(null);
    setNewWord('');
    setSelectedCategoryIds([]);
  }

  const thematicCategories = categories.filter(c => !c.color);


  if (pendingWords) {
    return (
        <div className="mb-8 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-center text-slate-700 dark:text-slate-200 mb-1">Оберіть тематичні категорії для слова:</h3>
            <p className="text-2xl font-bold text-cyan-500 dark:text-cyan-400 text-center">{pendingWords[0].swedishDisplay}</p>
            <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-4">
                Додаються варіанти: {pendingWords.map(p => p.partOfSpeech).join(', ')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {thematicCategories.map(category => {
                    const isSelected = selectedCategoryIds.includes(category.id);
                    return (
                        <button 
                            key={category.id} 
                            onClick={() => handleToggleCategory(category.id)}
                            className={`relative flex flex-col items-center justify-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 hover:bg-cyan-500/10 dark:hover:bg-cyan-900/50 rounded-lg transition-all aspect-square border-2 ${isSelected ? 'border-cyan-500' : 'border-transparent'}`}
                        >
                            {isSelected && (
                                <div className="absolute top-1 right-1 bg-white dark:bg-slate-800 rounded-full">
                                    <CheckCircleIcon className="w-5 h-5 text-cyan-500 dark:text-cyan-400"/>
                                </div>
                            )}
                            <img src={category.imageUrl} alt={category.name} className="w-10 h-10 object-cover rounded-full" />
                            <span className="text-xs text-center text-slate-800 dark:text-slate-200">{category.name}</span>
                        </button>
                    )
                })}
            </div>
             <div className="text-center mt-6 flex justify-center gap-4">
                <button onClick={handleCancel} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-4 py-2">
                    Скасувати
                </button>
                 <button 
                    onClick={handleConfirmSelection}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                    Додати слово
                </button>
            </div>
        </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-200 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-cyan-500 transition-shadow">
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          placeholder="Введіть шведське слово..."
          className="w-full bg-transparent p-2 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !newWord.trim()}
          className="flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold p-3 rounded-md transition-colors"
          aria-label="Додати слово"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
          ) : (
            <PlusIcon className="w-5 h-5"/>
          )}
        </button>
      </div>
    </form>
  );
};