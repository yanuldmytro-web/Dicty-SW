import React, { useState } from 'react';
import type { Category } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XMarkIcon } from './icons/XMarkIcon';

interface CategorySidebarProps {
  partOfSpeechCategories: Category[];
  thematicCategories: Category[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  categoryCounts: Map<string, number>;
  totalWordsCount: number;
  onAddCategory: (name: string, imageUrl: string) => void;
  onUpdateCategory: (id: string, name: string, imageUrl: string) => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  partOfSpeechCategories,
  thematicCategories,
  activeCategoryId,
  onSelectCategory,
  categoryCounts,
  totalWordsCount,
  onAddCategory,
  onUpdateCategory,
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryImg, setNewCategoryImg] = useState('');

    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editCategoryName, setEditCategoryName] = useState('');
    const [editCategoryImg, setEditCategoryImg] = useState('');

    const handleStartEdit = (category: Category) => {
        setEditingCategory(category);
        setEditCategoryName(category.name);
        setEditCategoryImg(category.imageUrl);
        setIsAdding(false);
    };

    const handleCancelEdit = () => {
        setEditingCategory(null);
        setEditCategoryName('');
        setEditCategoryImg('');
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCategory) {
            onUpdateCategory(editingCategory.id, editCategoryName, editCategoryImg);
            handleCancelEdit();
        }
    };
    
    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddCategory(newCategoryName, newCategoryImg);
        setNewCategoryName('');
        setNewCategoryImg('');
        setIsAdding(false);
    };

    const ThematicCategoryButton: React.FC<{category: Category}> = ({ category }) => {
        const isActive = activeCategoryId === category.id;
        return (
            <button
                onClick={() => onSelectCategory(category.id)}
                className={`w-full text-left flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${isActive ? 'bg-cyan-600 text-white' : 'hover:bg-slate-300/70 dark:hover:bg-slate-700/50'}`}
            >
                <span className="truncate">{category.name}</span>
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded-full ${isActive ? 'bg-cyan-800 text-cyan-100' : 'bg-slate-300 dark:bg-slate-600/80 text-slate-600 dark:text-slate-300'}`}>
                    {categoryCounts.get(category.id) || 0}
                </span>
            </button>
        )
    };

  return (
    <aside className="lg:col-span-1 space-y-6">
        <div className="space-y-2 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
            <h3 className="px-3 text-sm font-semibold text-slate-500 dark:text-slate-400">Фільтр</h3>
             <button
                onClick={() => onSelectCategory(null)}
                className={`w-full text-left flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${!activeCategoryId ? 'bg-cyan-600 text-white' : 'hover:bg-slate-300/70 dark:hover:bg-slate-700/50'}`}
            >
                <span>Всі слова</span>
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded-full ${!activeCategoryId ? 'bg-cyan-800 text-cyan-100' : 'bg-slate-300 dark:bg-slate-600/80 text-slate-600 dark:text-slate-300'}`}>
                    {totalWordsCount}
                </span>
            </button>
        </div>

      <div className="space-y-2 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
        <h3 className="px-3 text-sm font-semibold text-slate-500 dark:text-slate-400">Типи слів</h3>
        {partOfSpeechCategories.map(cat => {
            const isActive = activeCategoryId === cat.id;
            const style = !isActive && cat.color ? { backgroundColor: cat.color, color: cat.textColor, transition: 'filter 0.2s' } : {};
            return (
                <button
                    key={cat.id}
                    onClick={() => onSelectCategory(cat.id)}
                    className={`w-full text-left flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${isActive ? 'bg-cyan-600 text-white' : 'hover:brightness-110'}`}
                    style={style}
                >
                    <span className="truncate font-medium">{cat.name}</span>
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded-full transition-colors ${isActive ? 'bg-cyan-800 text-cyan-100' : 'bg-black/20'}`}>
                        {categoryCounts.get(cat.id) || 0}
                    </span>
                </button>
            )
        })}
      </div>

      <div className="space-y-2 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
        <div className="flex items-center justify-between px-3">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Тематичні категорії</h3>
          <button 
            onClick={() => { setIsAdding(true); setEditingCategory(null); }} 
            className="text-slate-400 hover:text-cyan-400 p-1"
            aria-label="Додати нову категорію"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
        
        {thematicCategories.map(cat => (
            <div key={cat.id}>
                {editingCategory?.id === cat.id ? (
                    <form onSubmit={handleSaveEdit} className="p-2 space-y-2 bg-slate-200 dark:bg-slate-700 rounded-md">
                        <input type="text" value={editCategoryName} onChange={e => setEditCategoryName(e.target.value)} placeholder="Назва" className="w-full bg-slate-100 dark:bg-slate-800 p-1 rounded-sm text-sm" />
                        <input type="text" value={editCategoryImg} onChange={e => setEditCategoryImg(e.target.value)} placeholder="URL зображення" className="w-full bg-slate-100 dark:bg-slate-800 p-1 rounded-sm text-sm" />
                        <div className="flex justify-end gap-2">
                           <button type="button" onClick={handleCancelEdit} className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"><XMarkIcon className="w-4 h-4"/></button>
                           <button type="submit" className="p-1 text-cyan-500 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-white"><CheckIcon className="w-4 h-4"/></button>
                        </div>
                    </form>
                ) : (
                    <div className="flex items-center group">
                        <ThematicCategoryButton category={cat} />
                        <button onClick={() => handleStartEdit(cat)} className="ml-2 p-1 text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 hover:text-cyan-500 dark:hover:text-cyan-400 transition-opacity">
                            <PencilIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        ))}
        
        {isAdding && (
          <form onSubmit={handleAddSubmit} className="p-2 space-y-2 bg-white/50 dark:bg-slate-900/50 rounded-md mt-2">
            <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Назва нової категорії" className="w-full bg-slate-200 dark:bg-slate-800 p-2 rounded-md text-sm" required />
            <input type="text" value={newCategoryImg} onChange={e => setNewCategoryImg(e.target.value)} placeholder="URL зображення (необов'язково)" className="w-full bg-slate-200 dark:bg-slate-800 p-2 rounded-md text-sm" />
            <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsAdding(false)} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white px-2 py-1">Скасувати</button>
                <button type="submit" className="text-sm bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 rounded-md">Додати</button>
            </div>
           </form>
        )}
      </div>
    </aside>
  );
};