import { Folio, Chapter, MetaSettings, DailyStat, BlockNode } from './types';
import { generateNovelRTF } from './rtfExport';
import { generateNovelPDF } from './pdfExport';

const DB_NAME = 'folio_ink_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function openDatabase(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in the browser'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('folios')) {
        db.createObjectStore('folios', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('chapters')) {
        const chapterStore = db.createObjectStore('chapters', { keyPath: 'id' });
        chapterStore.createIndex('novelId', 'novelId', { unique: false });
      }

      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('stats')) {
        db.createObjectStore('stats', { keyPath: 'date' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

// Fresh start: do not seed demo content or false writing rhythm.
// Purge previous demo novel and artificial stats from IndexedDB if present.
export async function initializeDatabase(): Promise<void> {
  const db = await openDatabase();
  const meta = await getMeta();

  if (!meta.freshStartCleaned) {
    try {
      const demoFolio = await getFolio('novel-the-salt-road');
      if (demoFolio) {
        await deleteFolio('novel-the-salt-road');
      }

      // Clear any artificial writing stats from the demo
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('stats', 'readwrite');
        const store = tx.objectStore('stats');
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      await saveMeta({
        dailyTarget: meta.dailyTarget || 500,
        lastOpenedNovelId: meta.lastOpenedNovelId === 'novel-the-salt-road' ? null : meta.lastOpenedNovelId,
        lastOpenedChapterId: meta.lastOpenedNovelId === 'novel-the-salt-road' ? null : meta.lastOpenedChapterId,
        freshStartCleaned: true,
      });
    } catch {
      // quiet failover
    }
  }
}

export async function getAllFolios(): Promise<Folio[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('folios', 'readonly');
    const store = tx.objectStore('folios');
    const req = store.getAll();
    req.onsuccess = () => {
      const list = (req.result as Folio[]) || [];
      // Sort by updatedAt descending
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getFolio(id: string): Promise<Folio | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('folios', 'readonly');
    const store = tx.objectStore('folios');
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as Folio) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFolio(folio: Folio): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('folios', 'readwrite');
    const store = tx.objectStore('folios');
    const req = store.put(folio);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteFolio(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['folios', 'chapters'], 'readwrite');
    const folioStore = tx.objectStore('folios');
    const chapterStore = tx.objectStore('chapters');

    folioStore.delete(id);

    // Delete all chapters belonging to this folio
    const index = chapterStore.index('novelId');
    const req = index.getAll(id);
    req.onsuccess = () => {
      const chapters = (req.result as Chapter[]) || [];
      for (const ch of chapters) {
        chapterStore.delete(ch.id);
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function duplicateFolio(id: string): Promise<Folio | null> {
  const original = await getFolio(id);
  if (!original) return null;

  const originalChapters = await getChaptersForNovel(id);
  const newNovelId = 'novel-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const now = Date.now();

  const newChapterOrder: string[] = [];
  const newChapters: Chapter[] = [];

  for (const ch of originalChapters) {
    const newChId = 'chap-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    newChapterOrder.push(newChId);
    newChapters.push({
      ...ch,
      id: newChId,
      novelId: newNovelId,
      updatedAt: now,
    });
  }

  const duplicated: Folio = {
    ...original,
    id: newNovelId,
    title: `${original.title} (Copy)`,
    chapterOrder: newChapterOrder,
    createdAt: now,
    updatedAt: now,
  };

  await saveFolio(duplicated);
  for (const ch of newChapters) {
    await saveChapterDirect(ch);
  }

  return duplicated;
}

export async function getChaptersForNovel(novelId: string): Promise<Chapter[]> {
  const db = await openDatabase();
  const folio = await getFolio(novelId);

  return new Promise((resolve, reject) => {
    const tx = db.transaction('chapters', 'readonly');
    const store = tx.objectStore('chapters');
    const index = store.index('novelId');
    const req = index.getAll(novelId);

    req.onsuccess = () => {
      const list = (req.result as Chapter[]) || [];
      // If folio has explicit chapterOrder, sort by that order
      if (folio && folio.chapterOrder && folio.chapterOrder.length > 0) {
        const orderMap = new Map<string, number>();
        folio.chapterOrder.forEach((id, idx) => orderMap.set(id, idx));
        list.sort((a, b) => {
          const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : a.order;
          const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : b.order;
          return orderA - orderB;
        });
      } else {
        list.sort((a, b) => a.order - b.order);
      }
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getChapter(id: string): Promise<Chapter | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chapters', 'readonly');
    const store = tx.objectStore('chapters');
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as Chapter) || null);
    req.onerror = () => reject(req.error);
  });
}

// Internal direct save without stats modification (for seeds, import, clone)
export async function saveChapterDirect(chapter: Chapter): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('chapters', 'readwrite');
    const store = tx.objectStore('chapters');
    const req = store.put(chapter);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Regular save chapter from editor, tracks delta for today's words
export async function saveChapter(
  chapter: Chapter,
  previousWordCount: number = chapter.wordCount
): Promise<void> {
  const db = await openDatabase();

  const delta = chapter.wordCount - previousWordCount;
  if (delta > 0) {
    await recordWordsAdded(delta);
  }

  // Update chapter
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('chapters', 'readwrite');
    const store = tx.objectStore('chapters');
    const req = store.put(chapter);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  // Also touch the parent folio updatedAt
  const folio = await getFolio(chapter.novelId);
  if (folio) {
    folio.updatedAt = Date.now();
    await saveFolio(folio);
  }
}

export async function deleteChapter(chapterId: string, novelId: string): Promise<void> {
  const db = await openDatabase();
  const folio = await getFolio(novelId);
  if (folio) {
    folio.chapterOrder = folio.chapterOrder.filter((id) => id !== chapterId);
    folio.updatedAt = Date.now();
    await saveFolio(folio);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('chapters', 'readwrite');
    const store = tx.objectStore('chapters');
    const req = store.delete(chapterId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function reorderChapters(novelId: string, newOrder: string[]): Promise<void> {
  const folio = await getFolio(novelId);
  if (!folio) return;
  folio.chapterOrder = newOrder;
  folio.updatedAt = Date.now();
  await saveFolio(folio);

  // Update individual chapter order fields as well
  const db = await openDatabase();
  const tx = db.transaction('chapters', 'readwrite');
  const store = tx.objectStore('chapters');

  newOrder.forEach((chapId, idx) => {
    const getReq = store.get(chapId);
    getReq.onsuccess = () => {
      const ch = getReq.result as Chapter;
      if (ch) {
        ch.order = idx;
        store.put(ch);
      }
    };
  });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Meta settings: dailyTarget, lastOpenedNovelId, lastOpenedChapterId
export async function getMeta(): Promise<MetaSettings> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('meta', 'readonly');
    const store = tx.objectStore('meta');
    const req = store.get('settings');
    req.onsuccess = () => {
      const res = req.result ? req.result.value : null;
      resolve({
        dailyTarget: res?.dailyTarget ?? 500,
        lastOpenedNovelId: res?.lastOpenedNovelId ?? null,
        lastOpenedChapterId: res?.lastOpenedChapterId ?? null,
      });
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveMeta(patch: Partial<MetaSettings>): Promise<void> {
  const current = await getMeta();
  const updated: MetaSettings = { ...current, ...patch };

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('meta', 'readwrite');
    const store = tx.objectStore('meta');
    const req = store.put({ key: 'settings', value: updated });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Daily stats: wordsWritten per day (delta)
export async function getTodayWordsWritten(): Promise<number> {
  const db = await openDatabase();
  const today = getTodayString();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('stats', 'readonly');
    const store = tx.objectStore('stats');
    const req = store.get(today);
    req.onsuccess = () => {
      const stat = req.result as DailyStat | undefined;
      resolve(stat ? stat.wordsWritten : 0);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function recordWordsAdded(count: number): Promise<void> {
  if (count <= 0) return;
  const db = await openDatabase();
  const today = getTodayString();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('stats', 'readwrite');
    const store = tx.objectStore('stats');
    const getReq = store.get(today);

    getReq.onsuccess = () => {
      const existing = (getReq.result as DailyStat) || { date: today, wordsWritten: 0 };
      existing.wordsWritten += count;
      const putReq = store.put(existing);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

export async function saveDailyStat(stat: DailyStat): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('stats', 'readwrite');
    const store = tx.objectStore('stats');
    const req = store.put(stat);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getPastNDaysStats(days: number = 7): Promise<DailyStat[]> {
  const db = await openDatabase();
  const dates: string[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('stats', 'readonly');
    const store = tx.objectStore('stats');
    const results: DailyStat[] = [];
    let completed = 0;

    dates.forEach((date, index) => {
      const req = store.get(date);
      req.onsuccess = () => {
        const stat = req.result as DailyStat | undefined;
        results[index] = {
          date,
          wordsWritten: stat ? stat.wordsWritten : 0,
        };
        completed++;
        if (completed === dates.length) {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  });
}

// Backup and Export
export async function exportAllData(): Promise<string> {
  const folios = await getAllFolios();
  const db = await openDatabase();

  const chapters: Chapter[] = await new Promise((resolve, reject) => {
    const tx = db.transaction('chapters', 'readonly');
    const store = tx.objectStore('chapters');
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as Chapter[]) || []);
    req.onerror = () => reject(req.error);
  });

  const stats: DailyStat[] = await new Promise((resolve, reject) => {
    const tx = db.transaction('stats', 'readonly');
    const store = tx.objectStore('stats');
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as DailyStat[]) || []);
    req.onerror = () => reject(req.error);
  });

  const meta = await getMeta();

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    folios,
    chapters,
    meta,
    stats,
  };

  return JSON.stringify(payload, null, 2);
}

export async function exportNovelAsJSON(novelId: string): Promise<string> {
  const folio = await getFolio(novelId);
  if (!folio) throw new Error('Novel not found');
  const chapters = await getChaptersForNovel(novelId);

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    folio,
    chapters,
  };

  return JSON.stringify(payload, null, 2);
}

export async function exportNovelAsRTF(novelId: string): Promise<string> {
  const folio = await getFolio(novelId);
  if (!folio) throw new Error('Novel not found');
  const chapters = await getChaptersForNovel(novelId);
  return generateNovelRTF(folio, chapters);
}

export async function exportNovelAsPDF(novelId: string): Promise<Uint8Array> {
  const folio = await getFolio(novelId);
  if (!folio) throw new Error('Novel not found');
  const chapters = await getChaptersForNovel(novelId);
  return generateNovelPDF(folio, chapters);
}

export async function importData(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);

  // If importing single novel
  if (data.folio && Array.isArray(data.chapters)) {
    const folio: Folio = data.folio;
    const chapters: Chapter[] = data.chapters;
    await saveFolio(folio);
    for (const ch of chapters) {
      await saveChapterDirect(ch);
    }
    return;
  }

  // If importing full backup
  if (Array.isArray(data.folios)) {
    for (const f of data.folios) {
      await saveFolio(f);
    }
  }

  if (Array.isArray(data.chapters)) {
    for (const ch of data.chapters) {
      await saveChapterDirect(ch);
    }
  }

  if (data.meta) {
    await saveMeta(data.meta);
  }

  if (Array.isArray(data.stats)) {
    const db = await openDatabase();
    const tx = db.transaction('stats', 'readwrite');
    const store = tx.objectStore('stats');
    for (const stat of data.stats) {
      store.put(stat);
    }
  }
}
