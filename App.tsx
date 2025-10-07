import React, { useState, useEffect, useMemo } from 'react';
import { WordInputForm } from './components/WordInputForm';
import { WordList } from './components/WordList';
import { QuizView } from './components/QuizView';
import { TextLearningView } from './components/TextLearningView';
import { SavedTextsView } from './components/SavedTextsView';
import type { WordEntry, Example, SavedText, Folder, Category } from './types';
import { AppView } from './types';
import { BookOpenIcon } from './components/icons/BookOpenIcon';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { DocumentTextIcon } from './components/icons/DocumentTextIcon';
import { fetchNewExample } from './services/geminiService';
import { BookmarkIcon } from './components/icons/BookmarkIcon';
import { PART_OF_SPEECH_CATEGORIES, THEMATIC_CATEGORIES } from './data/categories';
import { SunIcon } from './components/icons/SunIcon';
import { MoonIcon } from './components/icons/MoonIcon';

type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [words, setWords] = useState<WordEntry[]>(() => {
    try {
      const savedWordsJSON = localStorage.getItem('swedishWords');
      if (!savedWordsJSON) return [];
      
      const savedWords = JSON.parse(savedWordsJSON) as any[];
      
      return savedWords.map(word => {
        const migratedWord: any = { ...word };

        if (word.categoryId && !word.categoryIds) {
          migratedWord.categoryIds = [word.categoryId];
          delete migratedWord.categoryId;
        }
        if (!word.categoryIds) {
            migratedWord.categoryIds = [];
        }
        if (!word.partOfSpeech) {
            migratedWord.partOfSpeech = 'N/A';
        }
        if (!word.dateAdded) {
            migratedWord.dateAdded = new Date().toISOString();
        }
        if (!word.swedishDisplay) {
            migratedWord.swedishDisplay = word.swedish;
        }
        return migratedWord as WordEntry;
      });
    } catch (error) {
      console.error("Failed to parse or migrate words from localStorage", error);
      return [];
    }
  });

  const [userCategories, setUserCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('userThematicCategories');
      return saved ? JSON.parse(saved) : THEMATIC_CATEGORIES;
    } catch (error) {
      console.error("Failed to parse user categories from localStorage", error);
      return THEMATIC_CATEGORIES;
    }
  });

  const allCategories = useMemo(() => [...PART_OF_SPEECH_CATEGORIES, ...userCategories], [userCategories]);

  const [folders, setFolders] = useState<Folder[]>(() => {
    try {
      const savedFolders = localStorage.getItem('savedFolders');
      return savedFolders ? JSON.parse(savedFolders) : [];
    } catch (error) {
      console.error("Failed to parse folders from localStorage", error);
      return [];
    }
  });

  const [savedTexts, setSavedTexts] = useState<SavedText[]>(() => {
    try {
      const saved = localStorage.getItem('savedTexts');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Failed to parse saved texts from localStorage", error);
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<AppView>(AppView.Learning);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  const [currentTextTitle, setCurrentTextTitle] = useState('');
  const [currentTextContent, setCurrentTextContent] = useState('');

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
        return localStorage.getItem('theme') as Theme;
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
      setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    try {
      localStorage.setItem('swedishWords', JSON.stringify(words));
    } catch (error) {
      console.error("Failed to save words to localStorage", error);
    }
  }, [words]);

  useEffect(() => {
    try {
      localStorage.setItem('userThematicCategories', JSON.stringify(userCategories));
    } catch (error) {
      console.error("Failed to save user categories to localStorage", error);
    }
  }, [userCategories]);

  useEffect(() => {
    try {
      localStorage.setItem('savedFolders', JSON.stringify(folders));
    } catch (error) {
      console.error("Failed to save folders to localStorage", error);
    }
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem('savedTexts', JSON.stringify(savedTexts));
    } catch (error) {
      console.error("Failed to save texts to localStorage", error);
    }
  }, [savedTexts]);

  const handleWordsAdded = (newWords: WordEntry[]) => {
    setWords(prevWords => [...newWords, ...prevWords]);
  };

  const handleDeleteWord = (id: string) => {
    setWords(prevWords => prevWords.filter(word => word.id !== id));
  };

  const handleUpdateWordCategories = (wordId: string, categoryIds: string[]) => {
    setWords(prevWords => prevWords.map(word => 
      word.id === wordId ? { ...word, categoryIds } : word
    ));
  };
  
  const handleFetchNewExample = async (wordId: string) => {
    const word = words.find(w => w.id === wordId);
    if (!word) return;

    setError(null);
    try {
      const existingSwedishExamples = word.examples.map(ex => ex.swedish);
      const newExampleData = await fetchNewExample(word.swedish, existingSwedishExamples);
      
      const newExample: Example = {
        id: crypto.randomUUID(),
        swedish: newExampleData.example_sentence_swedish,
        ukrainian: newExampleData.example_sentence_ukrainian,
      };

      setWords(prevWords =>
        prevWords.map(w =>
          w.id === wordId
            ? { ...w, examples: [...w.examples, newExample] }
            : w
        )
      );
    } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError("An unknown error occurred while fetching a new example.");
        }
        // Re-throw to be caught by the component
        throw err;
    }
  };

  const handleSaveText = () => {
    const trimmedTitle = currentTextTitle.trim();
    const trimmedContent = currentTextContent.trim();
    if (!trimmedTitle || !trimmedContent) return;

    if (savedTexts.some(t => t.content === trimmedContent && t.title === trimmedTitle)) {
        setError("Текст з такою назвою та змістом вже існує.");
        return;
    }

    const newSavedText: SavedText = {
      id: crypto.randomUUID(),
      title: trimmedTitle,
      content: trimmedContent,
      dateAdded: new Date().toISOString(),
      folderId: null, // Saved to uncategorized by default
    };
    setSavedTexts(prev => [newSavedText, ...prev]);
  };

  const handleDeleteText = (id: string) => {
    setSavedTexts(prev => prev.filter(t => t.id !== id));
  };

  const handleSelectText = (text: SavedText) => {
    setCurrentTextTitle(text.title);
    setCurrentTextContent(text.content);
    setView(AppView.TextLearning);
  };
  
  const handleUpdateText = (updatedText: SavedText) => {
    setSavedTexts(prev => prev.map(t => t.id === updatedText.id ? updatedText : t));
  };

  const handleAddFolder = (name: string) => {
    if (!name.trim() || folders.some(f => f.name.toLowerCase() === name.trim().toLowerCase())) {
        setError("Папка з такою назвою вже існує або назва порожня.");
        return;
    }
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name: name.trim(),
    };
    setFolders(prev => [...prev, newFolder]);
  };

  const handleDeleteFolder = (folderId: string) => {
    // Move texts from the deleted folder to uncategorized
    setSavedTexts(prev => 
      prev.map(t => (t.folderId === folderId ? { ...t, folderId: null } : t))
    );
    setFolders(prev => prev.filter(f => f.id !== folderId));
  };

  const handleAddCategory = (name: string, imageUrl: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Назва категорії не може бути порожньою.");
      return;
    }
    if (allCategories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
        setError("Категорія з такою назвою вже існує.");
        return;
    }
    const newCategory: Category = {
        id: crypto.randomUUID(),
        name: trimmedName,
        // Default image if URL is empty
        imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=100',
    };
    setUserCategories(prev => [...prev, newCategory]);
  };

  const handleUpdateCategory = (id: string, name: string, imageUrl: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
        setError("Назва категорії не може бути порожньою.");
        return;
    }
    setUserCategories(prev => prev.map(c => 
      c.id === id 
        ? { ...c, name: trimmedName, imageUrl: imageUrl.trim() || c.imageUrl } 
        : c
    ));
  };


  const handleNavigateToTextLearning = () => {
    setCurrentTextTitle('');
    setCurrentTextContent('');
    setView(AppView.TextLearning);
  };


  const NavButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    ariaLabel: string;
  }> = ({ active, onClick, children, ariaLabel }) => (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`flex items-center justify-center flex-1 gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-cyan-600 text-white'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );

  const renderContent = () => {
    switch (view) {
      case AppView.Learning:
        return (
          <>
            <WordInputForm
              onWordsAdded={handleWordsAdded}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              setError={setError}
              categories={allCategories}
            />
            <WordList 
              words={words} 
              onDeleteWord={handleDeleteWord}
              onUpdateWordCategories={handleUpdateWordCategories}
              onFetchNewExample={handleFetchNewExample}
              onWordsAdded={handleWordsAdded}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              setError={setError}
              playbackSpeed={playbackSpeed}
              onPlaybackSpeedChange={setPlaybackSpeed}
              partOfSpeechCategories={PART_OF_SPEECH_CATEGORIES}
              thematicCategories={userCategories}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
            />
          </>
        );
      case AppView.TextLearning:
        const trimmedTitle = currentTextTitle.trim();
        const trimmedContent = currentTextContent.trim();
        const isCurrentTextSaved = trimmedContent !== '' && savedTexts.some(t => t.content === trimmedContent && t.title === trimmedTitle);

        return (
          <TextLearningView
            title={currentTextTitle}
            onTitleChange={setCurrentTextTitle}
            content={currentTextContent}
            onContentChange={setCurrentTextContent}
            words={words}
            onWordsAdded={handleWordsAdded}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            setError={setError}
            playbackSpeed={playbackSpeed}
            onPlaybackSpeedChange={setPlaybackSpeed}
            onSaveText={handleSaveText}
            isTextSaved={isCurrentTextSaved}
            allCategories={allCategories}
          />
        );
      case AppView.SavedTexts:
        return <SavedTextsView 
                  texts={savedTexts} 
                  folders={folders}
                  onSelectText={handleSelectText} 
                  onDeleteText={handleDeleteText}
                  onAddFolder={handleAddFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onUpdateText={handleUpdateText}
                />;
      case AppView.Quiz:
        return <QuizView words={words} onBack={() => setView(AppView.Learning)} allCategories={allCategories} />;
      default:
        return null;
    }
  }

  return (
    <div className="bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-screen p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8 relative">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 pb-2">
            Swedish Word Tester
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Вивчайте шведські слова за допомогою AI та тестів</p>

          <div className="absolute top-0 right-0">
            <button 
                onClick={toggleTheme}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                aria-label="Перемкнути тему"
            >
                {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
            </button>
          </div>
        </header>

        <nav className="flex justify-center gap-2 mb-8 p-2 bg-slate-200 dark:bg-slate-800 rounded-lg max-w-lg mx-auto">
          <NavButton active={view === AppView.Learning} onClick={() => setView(AppView.Learning)} ariaLabel="Перейти до режиму словника">
            <BookOpenIcon className="w-5 h-5" />
            Словник
          </NavButton>
          <NavButton active={view === AppView.TextLearning} onClick={handleNavigateToTextLearning} ariaLabel="Перейти до режиму навчання з текстом">
            <DocumentTextIcon className="w-5 h-5" />
            Текст
          </NavButton>
          <NavButton active={view === AppView.SavedTexts} onClick={() => setView(AppView.SavedTexts)} ariaLabel="Перейти до збережених текстів">
            <BookmarkIcon className="w-5 h-5" />
            Мої тексти
          </NavButton>
          <NavButton active={view === AppView.Quiz} onClick={() => setView(AppView.Quiz)} ariaLabel="Перейти до тестування">
            <SparklesIcon className="w-5 h-5" />
            Тест
          </NavButton>
        </nav>

        <main>
          {error && (
            <div className="bg-red-500/10 dark:bg-red-500/20 border border-red-500/50 text-red-600 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
              <strong className="font-bold">Помилка: </strong>
              <span className="block sm:inline">{error}</span>
              <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3" aria-label="Close">
                <span className="text-xl">×</span>
              </button>
            </div>
          )}

          {renderContent()}
        </main>

        <footer className="text-center mt-12 text-slate-500 text-sm">
          <p>Створено з ❤️ для вивчення шведської мови.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;