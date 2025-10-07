import React, { useState, useCallback, useMemo } from 'react';
import type { WordEntry, QuizQuestion, Category } from '../types';

interface QuizViewProps {
  words: WordEntry[];
  onBack: () => void;
  allCategories: Category[];
}

interface QuizSettings {
    direction: 'sv_to_ua' | 'ua_to_sv' | 'mixed';
    selectionMode: 'category' | 'recent';
    selectedCategoryIds: string[];
    recentMode: 'count' | 'days';
    recentCount: number;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

export const QuizView: React.FC<QuizViewProps> = ({ words, onBack, allCategories }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [quizState, setQuizState] = useState<'setup' | 'in_progress' | 'finished'>('setup');
  const [incorrectAnswers, setIncorrectAnswers] = useState<WordEntry[]>([]);
  
  const [quizSettings, setQuizSettings] = useState<QuizSettings>({
    direction: 'mixed',
    selectionMode: 'category',
    selectedCategoryIds: [],
    recentMode: 'count',
    recentCount: 10,
  });

  const filteredWords = useMemo(() => {
    let result = words;

    if (quizSettings.selectionMode === 'category') {
        if (quizSettings.selectedCategoryIds.length > 0) {
            const selectedIds = new Set(quizSettings.selectedCategoryIds);
            result = result.filter(word => 
                word.categoryIds.some(catId => selectedIds.has(catId))
            );
        } else {
            // If no category is selected, use all words
            result = words;
        }
    } else { // 'recent'
        const now = new Date();
        const sortedWords = [...words].sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        
        if (quizSettings.recentMode === 'count') {
            result = sortedWords.slice(0, quizSettings.recentCount);
        } else { // 'days'
            result = sortedWords.filter(word => {
                const wordDate = new Date(word.dateAdded);
                const diffDays = (now.getTime() - wordDate.getTime()) / (1000 * 3600 * 24);
                return diffDays <= 7;
            });
        }
    }
    return result;
  }, [words, quizSettings]);


  const generateQuestions = useCallback(() => {
    const wordsForQuiz = filteredWords;
    if (wordsForQuiz.length < 4) return;
    
    const shuffledWords = shuffleArray(wordsForQuiz);
    
    const quizQuestions: QuizQuestion[] = shuffledWords.map((word) => {
      const questionType = quizSettings.direction === 'mixed' 
        ? (Math.random() > 0.5 ? 'sv_to_ua' : 'ua_to_sv') 
        : quizSettings.direction;
      
      const correctAnswer = questionType === 'sv_to_ua' ? word.ukrainian : word.swedishDisplay;
      
      const distractors: string[] = [];
      const usedDistractorValues = new Set<string>([correctAnswer]);
      // Use all words for a richer pool of distractors
      const shuffledDistractorPool = shuffleArray(words.filter(w => w.id !== word.id));

      for (const w of shuffledDistractorPool) {
          const distractorValue = questionType === 'sv_to_ua' ? w.ukrainian : w.swedishDisplay;
          if (!usedDistractorValues.has(distractorValue)) {
              distractors.push(distractorValue);
              usedDistractorValues.add(distractorValue);
          }
          if (distractors.length >= 3) break;
      }

      // If we couldn't find 3 unique distractors, this question is invalid.
      if (distractors.length < 3) {
          return null;
      }

      return {
        wordEntry: word,
        options: shuffleArray([correctAnswer, ...distractors]),
        questionType: questionType,
      };
    }).filter((q): q is QuizQuestion => q !== null);

    setQuestions(quizQuestions);
  }, [words, filteredWords, quizSettings.direction]);

  const startQuiz = () => {
    generateQuestions();
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setIncorrectAnswers([]);
    setQuizState('in_progress');
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;

    const currentQuestion = questions[currentQuestionIndex];
    const correctAnswer = currentQuestion.questionType === 'sv_to_ua'
      ? currentQuestion.wordEntry.ukrainian
      : currentQuestion.wordEntry.swedishDisplay;
    
    setSelectedAnswer(answer);
    
    if (answer === correctAnswer) {
      setIsCorrect(true);
      setScore(prev => prev + 1);
    } else {
      setIsCorrect(false);
      setIncorrectAnswers(prev => [...prev, currentQuestion.wordEntry]);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
    } else {
      setQuizState('finished');
    }
  };

  const handleCategorySelection = (categoryId: string) => {
    setQuizSettings(prev => {
        const newSelectedIds = prev.selectedCategoryIds.includes(categoryId)
            ? prev.selectedCategoryIds.filter(id => id !== categoryId)
            : [...prev.selectedCategoryIds, categoryId];
        return { ...prev, selectedCategoryIds: newSelectedIds };
    });
  };

  if (words.length < 4) {
    return (
      <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-cyan-500 dark:text-cyan-400">Тестування недоступне</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">Будь ласка, додайте принаймні 4 слова до вашого словника, щоб почати тест.</p>
        <button onClick={onBack} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          Повернутися до навчання
        </button>
      </div>
    );
  }
  
  if (quizState === 'setup') {
    const partOfSpeechCategories = allCategories.filter(c => c.color);
    const thematicCategories = allCategories.filter(c => !c.color);
    const canStart = filteredWords.length >= 4;

    return (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md max-w-3xl mx-auto space-y-8">
            <h2 className="text-2xl text-center font-bold mb-4 text-cyan-500 dark:text-cyan-400">Налаштування тесту</h2>
            
            <fieldset>
                <legend className="text-lg font-semibold mb-3 text-slate-700 dark:text-slate-200">1. Напрямок перекладу</legend>
                <div className="flex flex-wrap gap-3">
                    {(['sv_to_ua', 'ua_to_sv', 'mixed'] as const).map(dir => (
                        <label key={dir} className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                            <input type="radio" name="direction" value={dir} checked={quizSettings.direction === dir} onChange={e => setQuizSettings(p => ({...p, direction: e.target.value as any}))} className="w-4 h-4 text-cyan-600 bg-slate-100 border-slate-300 focus:ring-cyan-500 dark:focus:ring-cyan-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"/>
                            <span className="text-slate-800 dark:text-slate-300">{ {sv_to_ua: 'Шведська → Українська', ua_to_sv: 'Українська → Шведська', mixed: 'Змішаний'}[dir] }</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            <fieldset>
                <legend className="text-lg font-semibold mb-3 text-slate-700 dark:text-slate-200">2. Вибір слів</legend>
                 <div className="flex flex-wrap gap-3 mb-4">
                    {(['category', 'recent'] as const).map(mode => (
                        <label key={mode} className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                            <input type="radio" name="selectionMode" value={mode} checked={quizSettings.selectionMode === mode} onChange={e => setQuizSettings(p => ({...p, selectionMode: e.target.value as any}))} className="w-4 h-4 text-cyan-600 bg-slate-100 border-slate-300 focus:ring-cyan-500 dark:focus:ring-cyan-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"/>
                            <span className="text-slate-800 dark:text-slate-300">{{category: 'За категоріями', recent: 'Останні додані'}[mode]}</span>
                        </label>
                    ))}
                </div>

                {quizSettings.selectionMode === 'category' ? (
                    <div className="p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg">
                        <p className="text-sm mb-3 text-slate-600 dark:text-slate-400">Оберіть одну або декілька категорій. Якщо нічого не обрано, тест буде по всім словам.</p>
                        <div className="space-y-3">
                            <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Типи слів</h4>
                                <div className="flex flex-wrap gap-2">
                                    {partOfSpeechCategories.map(cat => (
                                        <label key={cat.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-md border-2 transition-colors has-[:checked]:border-cyan-500 has-[:checked]:bg-cyan-500/10 border-slate-300 dark:border-slate-700">
                                            <input type="checkbox" value={cat.id} checked={quizSettings.selectedCategoryIds.includes(cat.id)} onChange={() => handleCategorySelection(cat.id)} className="w-4 h-4 rounded text-cyan-600 bg-slate-100 border-slate-300 focus:ring-cyan-500 dark:focus:ring-cyan-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"/>
                                            <span className="text-slate-800 dark:text-slate-300 text-sm">{cat.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                             <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Тематичні категорії</h4>
                                <div className="flex flex-wrap gap-2">
                                    {thematicCategories.map(cat => (
                                        <label key={cat.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-md border-2 transition-colors has-[:checked]:border-cyan-500 has-[:checked]:bg-cyan-500/10 border-slate-300 dark:border-slate-700">
                                            <input type="checkbox" value={cat.id} checked={quizSettings.selectedCategoryIds.includes(cat.id)} onChange={() => handleCategorySelection(cat.id)} className="w-4 h-4 rounded text-cyan-600 bg-slate-100 border-slate-300 focus:ring-cyan-500 dark:focus:ring-cyan-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"/>
                                            <span className="text-slate-800 dark:text-slate-300 text-sm">{cat.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg flex flex-wrap gap-x-6 gap-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="recentMode" value="count" checked={quizSettings.recentMode === 'count'} onChange={e => setQuizSettings(p => ({...p, recentMode: e.target.value as any}))} className="w-4 h-4 text-cyan-600 bg-slate-100 border-slate-300 focus:ring-cyan-500 dark:focus:ring-cyan-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"/>
                            <span className="text-slate-800 dark:text-slate-300">Останні</span>
                        </label>
                        {[10, 20, 50].map(count => (
                            <label key={count} className={`flex items-center gap-2 cursor-pointer ml-2 ${quizSettings.recentMode !== 'count' ? 'opacity-50' : ''}`}>
                                <input type="radio" name="recentCount" value={count} checked={quizSettings.recentCount === count} onChange={e => setQuizSettings(p => ({...p, recentCount: Number(e.target.value)}))} disabled={quizSettings.recentMode !== 'count'} className="w-4 h-4 text-cyan-600 bg-slate-100 border-slate-300 focus:ring-cyan-500 dark:focus:ring-cyan-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"/>
                                <span className="text-slate-800 dark:text-slate-300">{count} слів</span>
                            </label>
                        ))}
                         <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="recentMode" value="days" checked={quizSettings.recentMode === 'days'} onChange={e => setQuizSettings(p => ({...p, recentMode: e.target.value as any}))} className="w-4 h-4 text-cyan-600 bg-slate-100 border-slate-300 focus:ring-cyan-500 dark:focus:ring-cyan-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"/>
                            <span className="text-slate-800 dark:text-slate-300">За останні 7 днів</span>
                        </label>
                    </div>
                )}
            </fieldset>

             <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                    Обрано слів: <span className="font-bold text-cyan-500 dark:text-cyan-400">{filteredWords.length}</span>.
                    {!canStart && <span className="text-red-500 dark:text-red-400 block text-sm">Для початку тесту потрібно мінімум 4 слова.</span>}
                </p>
                <button onClick={startQuiz} disabled={!canStart} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-lg transition-all text-lg disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:scale-100 hover:scale-105 active:scale-100">
                    Почати тест
                </button>
            </div>
        </div>
    );
  }

  if (quizState === 'finished') {
    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    return (
        <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-2 text-cyan-500 dark:text-cyan-400">Тест завершено!</h2>
            <p className="text-4xl font-bold my-4">{percentage}%</p>
            <p className="text-slate-600 dark:text-slate-300 mb-6">Ваш результат: {score} з {questions.length} правильних відповідей.</p>
            
            {incorrectAnswers.length > 0 && (
                <div className="my-8 text-left max-w-md mx-auto">
                    <h3 className="font-semibold text-lg mb-3 text-slate-700 dark:text-slate-200">Слова для повторення:</h3>
                    <ul className="space-y-2">
                        {incorrectAnswers.map(word => (
                            <li key={word.id} className="p-3 bg-red-500/10 dark:bg-red-900/20 rounded-lg flex justify-between items-center">
                                <span className="font-semibold text-red-700 dark:text-red-300">{word.swedishDisplay}</span>
                                <span className="text-slate-600 dark:text-slate-400">{word.ukrainian}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex gap-4 justify-center mt-8">
                <button onClick={startQuiz} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    Спробувати ще раз
                </button>
                 <button onClick={() => setQuizState('setup')} className="bg-slate-500 dark:bg-slate-600 hover:bg-slate-600 dark:hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    Новий тест
                </button>
            </div>
        </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
      return (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md text-center">
            <h2 className="text-2xl font-bold text-red-500 dark:text-red-400">Помилка генерації тесту</h2>
            <p className="text-slate-600 dark:text-slate-300 my-4">Не вдалося створити питання з обраних слів. Можливо, серед них забагато однакових перекладів.</p>
            <button onClick={() => setQuizState('setup')} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                Повернутись до налаштувань
            </button>
        </div>
      );
  }
  
  const questionText = currentQuestion.questionType === 'sv_to_ua'
    ? `Який переклад слова "${currentQuestion.wordEntry.swedishDisplay}"?`
    : `Яке слово перекладається як "${currentQuestion.wordEntry.ukrainian}"?`;

  const correctAnswer = currentQuestion.questionType === 'sv_to_ua'
      ? currentQuestion.wordEntry.ukrainian
      : currentQuestion.wordEntry.swedishDisplay;

  return (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-cyan-500 dark:text-cyan-400">Тест</h2>
        <p className="text-slate-500 dark:text-slate-400 font-mono">{currentQuestionIndex + 1} / {questions.length}</p>
      </div>
      <div className="mb-6 h-16 flex items-center justify-center">
        <p className="text-xl text-center text-slate-800 dark:text-slate-200">{questionText}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {currentQuestion.options.map(option => {
          const isSelected = selectedAnswer === option;
          let buttonClass = 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600';
          
          if (selectedAnswer) {
            if (option === correctAnswer) {
                buttonClass = 'bg-green-500 text-white';
            } else if (isSelected) {
                buttonClass = 'bg-red-500 text-white';
            } else {
                buttonClass = 'bg-slate-200 dark:bg-slate-700 opacity-50';
            }
          }

          return (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              disabled={!!selectedAnswer}
              className={`w-full p-4 rounded-lg text-left transition-all text-slate-800 dark:text-slate-100 font-medium ${buttonClass} disabled:cursor-not-allowed`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {selectedAnswer && (
        <div className="mt-6 text-center">
            {isCorrect ? (
                <p className="text-green-600 dark:text-green-400 font-semibold">Правильно!</p>
            ) : (
                <p className="text-red-600 dark:text-red-400 font-semibold">Неправильно. Правильна відповідь: {correctAnswer}</p>
            )}
            <button
                onClick={handleNextQuestion}
                className="mt-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-8 rounded-lg transition-colors"
            >
                {currentQuestionIndex < questions.length - 1 ? 'Наступне' : 'Результати'}
            </button>
        </div>
      )}
    </div>
  );
};