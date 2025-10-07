import React, { useState, useMemo } from 'react';
import type { SavedText, Folder } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';
import { FolderIcon } from './icons/FolderIcon';

interface SavedTextsViewProps {
  texts: SavedText[];
  folders: Folder[];
  onSelectText: (text: SavedText) => void;
  onDeleteText: (id: string) => void;
  onAddFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onUpdateText: (text: SavedText) => void;
}

export const SavedTextsView: React.FC<SavedTextsViewProps> = ({ 
    texts, folders, onSelectText, onDeleteText, onAddFolder, onDeleteFolder, onUpdateText 
}) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null); // null for uncategorized

  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onAddFolder(newFolderName.trim());
      setNewFolderName('');
    }
  };

  const handleMoveText = (textId: string, targetFolderId: string | null) => {
    const textToMove = texts.find(t => t.id === textId);
    if (textToMove) {
        onUpdateText({ ...textToMove, folderId: targetFolderId });
    }
  };

  const filteredTexts = useMemo(() => {
    return texts.filter(t => t.folderId === selectedFolderId).sort((a,b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
  }, [texts, selectedFolderId]);

  if (texts.length === 0 && folders.length === 0) {
    return (
      <div className="text-center py-10 px-4 bg-slate-200/60 dark:bg-slate-800/50 rounded-lg">
        <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Немає збережених текстів</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Збережіть текст з вкладки "Текст", щоб побачити його тут.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-3 gap-6">
      {/* Sidebar with Folders */}
      <aside className="md:col-span-1 space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Папки</h2>
        <form onSubmit={handleAddFolder} className="flex items-center gap-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Нова папка..."
            className="w-full bg-white dark:bg-slate-800 p-2 rounded-md text-sm focus:ring-1 focus:ring-cyan-500 focus:outline-none"
          />
          <button type="submit" className="p-2 bg-cyan-600 hover:bg-cyan-500 rounded-md shrink-0" aria-label="Додати папку">
            <PlusIcon className="w-5 h-5 text-white" />
          </button>
        </form>
        <ul className="space-y-1">
          <li>
            <button 
              onClick={() => setSelectedFolderId(null)}
              className={`w-full text-left flex items-center gap-3 p-3 rounded-md transition-colors ${selectedFolderId === null ? 'bg-cyan-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              <FolderIcon className="w-5 h-5 shrink-0" />
              <span className="truncate flex-grow font-medium">Без папки</span>
            </button>
          </li>
          {folders.map(folder => (
            <li key={folder.id}>
              <button 
                onClick={() => setSelectedFolderId(folder.id)}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-md transition-colors group ${selectedFolderId === folder.id ? 'bg-cyan-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                <FolderIcon className="w-5 h-5 shrink-0" />
                <span className="truncate flex-grow font-medium">{folder.name}</span>
                <TrashIcon 
                    onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }}
                    className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-red-400 opacity-50 group-hover:opacity-100 transition-opacity shrink-0" 
                />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main content with Texts */}
      <main className="md:col-span-3 lg:col-span-2">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
          {selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.name : 'Тексти без папки'}
        </h2>
        {filteredTexts.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-200/60 dark:bg-slate-800/50 rounded-lg">
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Тут порожньо</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">У цій папці немає збережених текстів.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTexts.map(text => (
              <div key={text.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg flex items-start gap-4">
                <div className="flex-grow cursor-pointer" onClick={() => onSelectText(text)}>
                  <h4 className="font-bold text-cyan-500 dark:text-cyan-400 mb-1">{text.title}</h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-2" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                  }}>
                      {text.content}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Додано: {new Date(text.dateAdded).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0 w-32">
                   <select 
                      value={text.folderId ?? 'null'}
                      onChange={(e) => handleMoveText(text.id, e.target.value === 'null' ? null : e.target.value)}
                      className="text-xs bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded p-1 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="null">Без папки</option>
                      {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                   </select>
                   <button 
                     onClick={(e) => { e.stopPropagation(); onDeleteText(text.id); }} 
                     className="p-1 text-slate-400 hover:text-red-500 transition-colors self-end"
                     aria-label="Видалити текст"
                    >
                     <TrashIcon className="w-5 h-5" />
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};