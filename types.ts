export interface Example {
  id: string;
  swedish: string;
  ukrainian: string;
}

export interface WordEntry {
  id:string;
  swedish: string; // the base word for matching
  swedishDisplay: string; // the word with article/prefix for display
  partOfSpeech: string;
  ukrainian: string;
  examples: Example[];
  categoryIds: string[];
  dateAdded: string;
}

export interface QuizQuestion {
  wordEntry: WordEntry;
  options: string[];
  questionType: 'sv_to_ua' | 'ua_to_sv';
}

export interface SavedText {
  id: string;
  title: string;
  content: string;
  dateAdded: string;
  folderId: string | null;
}

export interface Folder {
  id: string;
  name: string;
}

export interface Category {
    id: string;
    name: string;
    imageUrl: string;
    color?: string;
    textColor?: string;
}

export enum AppView {
  Learning = 'LEARNING',
  TextLearning = 'TEXT_LEARNING',
  Quiz = 'QUIZ',
  SavedTexts = 'SAVED_TEXTS',
}