'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Folio, Chapter, MetaSettings, AppView, DailyStat } from '@/lib/types';
import {
  initializeDatabase,
  getAllFolios,
  getFolio,
  getChaptersForNovel,
  getMeta,
  saveMeta,
  getTodayWordsWritten,
  getPastNDaysStats,
  saveFolio,
  saveChapter,
} from '@/lib/db';
import { generateCoverPlaceholder } from '@/lib/utils-folio';
import { COVER_TEMPLATES } from '@/lib/covers';
import { AnimatePresence, motion } from 'motion/react';
import { LibraryView } from '@/components/LibraryView';
import { NovelView } from '@/components/NovelView';
import { PageView } from '@/components/PageView';
import { SettingsModal } from '@/components/SettingsModal';

export default function FolioApp() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [view, setView] = useState<AppView>('library');
  const [folios, setFolios] = useState<Folio[]>([]);
  const [novelWordCounts, setNovelWordCounts] = useState<Record<string, number>>({});
  const [activeNovelId, setActiveNovelId] = useState<string | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeFolio, setActiveFolio] = useState<Folio | null>(null);
  const [activeChapters, setActiveChapters] = useState<Chapter[]>([]);
  const [todayWords, setTodayWords] = useState<number>(0);
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [settings, setSettings] = useState<MetaSettings>({
    dailyTarget: 500,
    lastOpenedNovelId: null,
    lastOpenedChapterId: null,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load and rollup all novel word counts
  const refreshLibraryData = useCallback(async () => {
    const list = await getAllFolios();
    setFolios(list);

    const counts: Record<string, number> = {};
    for (const f of list) {
      const chaps = await getChaptersForNovel(f.id);
      const total = chaps.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
      counts[f.id] = total;
    }
    setNovelWordCounts(counts);

    const today = await getTodayWordsWritten();
    setTodayWords(today);

    const history = await getPastNDaysStats(7);
    setStats(history);
  }, []);

  // Refresh active novel details and chapters
  const refreshActiveFolio = useCallback(async (novelId: string) => {
    const f = await getFolio(novelId);
    if (!f) return;
    const chaps = await getChaptersForNovel(novelId);
    setActiveFolio(f);
    setActiveChapters(chaps);

    // Also update today's words
    const today = await getTodayWordsWritten();
    setTodayWords(today);
  }, []);

  // Initial startup: init DB, seed if empty, restore last-opened novel/chapter
  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        await initializeDatabase();
        if (!active) return;

        const currentMeta = await getMeta();
        setSettings(currentMeta);

        const list = await getAllFolios();
        setFolios(list);

        const counts: Record<string, number> = {};
        for (const f of list) {
          const chaps = await getChaptersForNovel(f.id);
          const total = chaps.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
          counts[f.id] = total;
        }
        setNovelWordCounts(counts);

        const today = await getTodayWordsWritten();
        setTodayWords(today);

        const history = await getPastNDaysStats(7);
        setStats(history);

        // Check if there was a last-opened novel to restore
        if (currentMeta.lastOpenedNovelId) {
          const targetFolio = list.find((f) => f.id === currentMeta.lastOpenedNovelId);
          if (targetFolio) {
            setActiveNovelId(targetFolio.id);
            setActiveFolio(targetFolio);
            const chaps = await getChaptersForNovel(targetFolio.id);
            setActiveChapters(chaps);

            if (
              currentMeta.lastOpenedChapterId &&
              chaps.some((c) => c.id === currentMeta.lastOpenedChapterId)
            ) {
              setActiveChapterId(currentMeta.lastOpenedChapterId);
              setView('page');
            } else {
              setView('novel');
            }
          }
        }
      } catch (err) {
        console.error('Folio initialization error:', err);
      } finally {
        if (active) {
          setIsLoaded(true);
        }
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, []);

  // Navigation handlers
  const handleOpenNovel = async (novelId: string) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    setActiveNovelId(novelId);
    setActiveChapterId(null);
    setView('novel');
    await refreshActiveFolio(novelId);
    await saveMeta({ lastOpenedNovelId: novelId, lastOpenedChapterId: null });
  };

  const handleOpenChapter = async (chapterId: string) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    setActiveChapterId(chapterId);
    setView('page');
    if (activeNovelId) {
      await saveMeta({
        lastOpenedNovelId: activeNovelId,
        lastOpenedChapterId: chapterId,
      });
    }
  };

  const handleBackToLibrary = async () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    setView('library');
    setActiveNovelId(null);
    setActiveChapterId(null);
    setActiveFolio(null);
    setActiveChapters([]);
    await refreshLibraryData();
    await saveMeta({ lastOpenedNovelId: null, lastOpenedChapterId: null });
  };

  const handleBackToNovel = async () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    setView('novel');
    setActiveChapterId(null);
    if (activeNovelId) {
      await refreshActiveFolio(activeNovelId);
      await saveMeta({ lastOpenedNovelId: activeNovelId, lastOpenedChapterId: null });
    }
  };

  // Create a new novel
  const handleCreateNovel = async () => {
    const novelId = 'novel-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const chapId = 'chap-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const now = Date.now();

    const newFolio: Folio = {
      id: novelId,
      title: 'Untitled manuscript',
      premise: '',
      status: 'draft',
      targetLength: 50000,
      coverBlob: COVER_TEMPLATES[0].generate('Untitled manuscript'),
      createdAt: now,
      updatedAt: now,
      chapterOrder: [chapId],
    };

    const newChapter: Chapter = {
      id: chapId,
      novelId,
      title: 'Chapter 1',
      content: [{ id: 'b-' + now, type: 'paragraph', html: '', text: '' }],
      wordCount: 0,
      order: 0,
      updatedAt: now,
    };

    await saveFolio(newFolio);
    await saveChapter(newChapter);

    await refreshLibraryData();
    await handleOpenNovel(novelId);
  };

  // Chapter updated inside PageView
  const handleChapterUpdated = async () => {
    const today = await getTodayWordsWritten();
    setTodayWords(today);
    if (activeNovelId) {
      const chaps = await getChaptersForNovel(activeNovelId);
      setActiveChapters(chaps);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F4EFE6] flex items-center justify-center">
        <span className="font-serif text-sm tracking-widest text-[#57534E] uppercase select-none">
          Folio
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4EFE6] text-[#1C1917] overflow-x-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {view === 'library' && (
          <motion.div
            key="view-library"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="w-full min-h-screen flex flex-col"
          >
            <LibraryView
              folios={folios}
              novelWordCounts={novelWordCounts}
              todayWords={todayWords}
              stats={stats}
              settings={settings}
              onSelectNovel={handleOpenNovel}
              onCreateNovel={handleCreateNovel}
              onRefresh={refreshLibraryData}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </motion.div>
        )}

        {view === 'novel' && activeFolio && (
          <motion.div
            key={`view-novel-${activeFolio.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="w-full min-h-screen flex flex-col"
          >
            <NovelView
              folio={activeFolio}
              chapters={activeChapters}
              todayWords={todayWords}
              settings={settings}
              onBackToLibrary={handleBackToLibrary}
              onOpenChapter={handleOpenChapter}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onRefreshFolio={() => {
                if (activeNovelId) refreshActiveFolio(activeNovelId);
              }}
            />
          </motion.div>
        )}

        {view === 'page' && activeFolio && activeChapterId && (
          <motion.div
            key={`view-page-${activeChapterId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="w-full min-h-screen flex flex-col"
          >
            <PageView
              folio={activeFolio}
              chapterId={activeChapterId}
              chapters={activeChapters}
              todayWords={todayWords}
              dailyTarget={settings.dailyTarget}
              onBackToNovel={handleBackToNovel}
              onSelectChapter={handleOpenChapter}
              onChapterUpdated={handleChapterUpdated}
              onUpdateFolio={async (patch) => {
                const updated = { ...activeFolio, ...patch, updatedAt: Date.now() };
                await saveFolio(updated);
                setActiveFolio(updated);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsUpdated={(newSettings) => setSettings(newSettings)}
        onDataImported={async () => {
          await refreshLibraryData();
          const meta = await getMeta();
          setSettings(meta);
        }}
      />
    </div>
  );
}
