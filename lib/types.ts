export type NovelStatus = 'draft' | 'revising' | 'complete';

export type BlockNode =
  | { id: string; type: 'paragraph'; html: string; text?: string }
  | { id: string; type: 'sceneBreak' };

export interface Folio {
  id: string;
  title: string;
  premise?: string;
  status: NovelStatus;
  targetLength?: number;
  deadline?: string; // YYYY-MM-DD
  coverBlob?: string; // base64 / data URL / svg
  createdAt: number;
  updatedAt: number;
  chapterOrder: string[];
}

export interface Chapter {
  id: string;
  novelId: string;
  title: string;
  content: BlockNode[];
  wordCount: number;
  order: number;
  updatedAt: number;
}

export interface MetaSettings {
  dailyTarget: number; // default 500
  lastOpenedNovelId: string | null;
  lastOpenedChapterId: string | null;
  freshStartCleaned?: boolean;
}

export interface DailyStat {
  date: string; // YYYY-MM-DD
  wordsWritten: number;
}

export type AppView = 'library' | 'novel' | 'page';
