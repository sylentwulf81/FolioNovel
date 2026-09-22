'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Folio, Chapter, NovelStatus, MetaSettings } from '@/lib/types';
import { MetricsDrawer } from './MetricsDrawer';
import { NovelSettingsDrawer } from './NovelSettingsDrawer';
import { CoverGalleryModal } from './CoverGalleryModal';
import {
  ArrowLeft,
  Settings,
  Target,
  Cloud,
  Check,
  Loader2,
  Plus,
} from 'lucide-react';
import {
  saveFolio,
  reorderChapters,
  saveChapter,
  deleteChapter,
  deleteFolio,
  duplicateFolio,
} from '@/lib/db';
import {
  syncWithDrive,
  subscribeToGoogleAuth,
  hasActiveAccessToken,
  signInWithGoogle,
} from '@/lib/googleDriveSync';

interface NovelViewProps {
  folio: Folio;
  chapters: Chapter[];
  todayWords: number;
  settings: MetaSettings;
  onBackToLibrary: () => void;
  onOpenChapter: (chapterId: string) => void;
  onRefreshFolio: () => void;
  onOpenSettings?: () => void;
}

export const NovelView: React.FC<NovelViewProps> = ({
  folio,
  chapters,
  todayWords,
  settings,
  onBackToLibrary,
  onOpenChapter,
  onRefreshFolio,
  onOpenSettings,
}) => {
  const [title, setTitle] = useState(folio.title);
  const [premise, setPremise] = useState(folio.premise || '');
  const [status, setStatus] = useState<NovelStatus>(folio.status);
  const [targetLength, setTargetLength] = useState<string>(
    folio.targetLength ? String(folio.targetLength) : ''
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [draggedChapterIndex, setDraggedChapterIndex] = useState<number | null>(null);
  const [dragOverChapterIndex, setDragOverChapterIndex] = useState<number | null>(null);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [isNovelSettingsOpen, setIsNovelSettingsOpen] = useState(false);
  const [isCoverGalleryOpen, setIsCoverGalleryOpen] = useState(false);

  // Sync state tracking: base color on any change, turns green when synced
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'unsaved' | 'synced'>('idle');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const lastSyncedVersionRef = useRef<number>(folio.updatedAt);

  // When novel folio or chapters change, mark as having unsynced changes (base color)
  useEffect(() => {
    if (folio.updatedAt > lastSyncedVersionRef.current) {
      setSyncState('unsaved');
    }
  }, [folio.updatedAt]);

  const handleSyncClick = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback('Syncing…');

    try {
      if (!hasActiveAccessToken()) {
        // Prompt Google Sign-in with Drive scope if not already connected
        await signInWithGoogle();
      }
      const res = await syncWithDrive();
      if (res.status === 'error' || res.status === 'permission_denied') {
        setSyncFeedback(res.message);
        setTimeout(() => setSyncFeedback(null), 3500);
      } else {
        lastSyncedVersionRef.current = Date.now();
        setSyncState('synced');
        setSyncFeedback('Synced');
        setTimeout(() => {
          setSyncFeedback(null);
        }, 3000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setSyncFeedback(msg);
      setTimeout(() => setSyncFeedback(null), 3500);
    } finally {
      setIsSyncing(false);
    }
  };

  // Total words of the novel
  const totalNovelWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
  const dailyTarget = settings.dailyTarget || 500;
  const targetProgress = Math.min(100, Math.max(0, (todayWords / dailyTarget) * 100));

  // Autosave novel details
  const updateFolioField = React.useCallback(
    async (patch: Partial<Folio>) => {
      const now = Date.now();
      const updated: Folio = {
        ...folio,
        ...patch,
        updatedAt: now,
      };
      setSyncState('unsaved');
      await saveFolio(updated);
      onRefreshFolio();
    },
    [folio, onRefreshFolio]
  );

  const handleTitleBlur = () => {
    const trimmed = title.trim() || 'Untitled manuscript';
    setTitle(trimmed);
    updateFolioField({ title: trimmed });
  };

  const handlePremiseBlur = () => {
    updateFolioField({ premise: premise.trim() });
  };

  const handleStatusChange = (newStatus: NovelStatus) => {
    setStatus(newStatus);
    updateFolioField({ status: newStatus });
  };

  const handleTargetLengthBlur = () => {
    const parsed = parseInt(targetLength, 10);
    const val = isNaN(parsed) || parsed <= 0 ? undefined : parsed;
    updateFolioField({ targetLength: val });
  };

  const handleAddChapter = async () => {
    const newOrderIndex = chapters.length;
    const newChapId = 'chap-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newChapter: Chapter = {
      id: newChapId,
      novelId: folio.id,
      title: `Chapter ${newOrderIndex + 1}`,
      content: [{ id: 'b-' + Date.now(), type: 'paragraph', html: '', text: '' }],
      wordCount: 0,
      order: newOrderIndex,
      updatedAt: Date.now(),
    };

    setSyncState('unsaved');
    await saveChapter(newChapter);
    const newChapterOrder = [...(folio.chapterOrder || []), newChapId];
    await saveFolio({
      ...folio,
      chapterOrder: newChapterOrder,
      updatedAt: Date.now(),
    });

    onRefreshFolio();
    onOpenChapter(newChapId);
  };

  const handleDeleteChapter = async (e: React.MouseEvent, chapId: string) => {
    e.stopPropagation();
    setSyncState('unsaved');
    await deleteChapter(chapId, folio.id);
    onRefreshFolio();
  };

  const handleMoveChapter = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= chapters.length || fromIndex === toIndex) return;

    const list = [...chapters];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);

    const newOrder = list.map((c) => c.id);
    setSyncState('unsaved');
    await reorderChapters(folio.id, newOrder);
    onRefreshFolio();
  };

  const handleDuplicateNovel = async () => {
    await duplicateFolio(folio.id);
    onBackToLibrary();
  };

  const handleDeleteNovel = async () => {
    await deleteFolio(folio.id);
    onBackToLibrary();
  };

  return (
    <div id="folio-novel-view" className="min-h-screen flex flex-col bg-[#F4EFE6] text-[#1C1917]">
      {/* 2px thin progress bar for daily target */}
      <div className="w-full h-[2px] bg-[#E7E0D4] overflow-hidden">
        <div
          className="h-full bg-[#6B2D2D] transition-all duration-300 ease-out"
          style={{ width: `${targetProgress}%` }}
        />
      </div>

      {/* Header bar: Back to library & Target -> Sync -> Settings */}
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 flex items-center justify-between border-b border-[#E7E0D4]/60">
        <button
          id="back-to-library-btn"
          onClick={onBackToLibrary}
          title="Back to Library"
          aria-label="Back to Library"
          className="text-xs uppercase tracking-widest text-[#57534E] hover:text-[#1C1917] transition-colors flex items-center gap-1.5 py-1.5 px-1 sm:px-2 rounded hover:bg-[#EAE3D6]/50 sm:hover:bg-transparent cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">Library</span>
        </button>

        {/* Header Actions in Exact Requested Order:
            1. Target (slide menu)
            2. Sync (cloud icon, base color on change, tap to sync, green when synced)
            3. Settings (slide menu) */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 text-xs uppercase tracking-wider text-[#57534E]">
          {/* 1. Target (slide menu) */}
          <button
            id="novel-metrics-btn"
            onClick={() => setIsMetricsOpen(true)}
            className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1 rounded hover:bg-[#EAE3D6]/60 hover:text-[#1C1917] transition-colors cursor-pointer"
            title="Word count & target progress (slide menu)"
            aria-label="Target"
          >
            <Target className="w-4 h-4 flex-shrink-0" />
            <span className="hidden xs:inline">Target</span>
          </button>

          {/* 2. Sync (cloud icon) */}
          <button
            id="novel-sync-cloud-btn"
            type="button"
            onClick={handleSyncClick}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1 rounded transition-colors cursor-pointer ${
              syncState === 'synced'
                ? 'text-[#2E7D32] hover:bg-[#2E7D32]/10 font-medium'
                : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#EAE3D6]/60'
            }`}
            title={
              syncState === 'synced'
                ? 'Manuscript is synced to cloud (tap to sync again)'
                : 'Tap to sync novel to Google Drive'
            }
            aria-label="Sync to cloud"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin text-[#57534E]" />
            ) : syncState === 'synced' ? (
              <Check className="w-4 h-4 flex-shrink-0 text-[#2E7D32]" />
            ) : (
              <Cloud className="w-4 h-4 flex-shrink-0 text-[#57534E]" />
            )}
            <span className="hidden xs:inline">
              {syncFeedback ? syncFeedback : syncState === 'synced' ? 'Synced' : 'Sync'}
            </span>
          </button>

          {/* 3. Settings (slide menu) */}
          <button
            id="novel-settings-btn"
            type="button"
            onClick={() => setIsNovelSettingsOpen(true)}
            className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1 rounded hover:bg-[#EAE3D6]/60 hover:text-[#1C1917] transition-colors cursor-pointer"
            title="Manuscript Settings & Tools (slide menu)"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span className="hidden xs:inline">Settings</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10 flex-1 space-y-8 sm:space-y-12">
        {/* Top Details Section: Cover & Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] md:grid-cols-[180px_1fr] gap-6 md:gap-10 items-start">
          {/* Cover display (3:4 ratio) & selector */}
          <div className="flex flex-col items-start space-y-2.5">
            <div
              id="novel-cover-art-container"
              role="button"
              tabIndex={0}
              aria-label="Open cover gallery"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsCoverGalleryOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsCoverGalleryOpen(true);
                }
              }}
              className="group cursor-pointer relative aspect-[3/4] w-28 sm:w-36 md:w-full rounded-lg overflow-hidden bg-[#EAE3D6] border border-[#E7E0D4] paper-shadow focus:outline-none focus:ring-2 focus:ring-[#6B2D2D]/50"
            >
              {folio.coverBlob ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={folio.coverBlob}
                  alt={folio.title}
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#EFE9DC]">
                  <span className="text-xs text-[#57534E]">Choose cover</span>
                </div>
              )}
              <div className="absolute inset-0 bg-[#1C1917]/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="text-xs uppercase tracking-wider text-[#FBF7F0] font-sans bg-[#1C1917]/75 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md shadow-sm">
                  Select Cover
                </span>
              </div>
            </div>

            <button
              id="novel-select-cover-btn"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsCoverGalleryOpen(true);
              }}
              className="w-28 sm:w-36 md:w-full py-1.5 px-2 rounded-lg border border-[#D5CDBC] bg-[#F4EFE6] hover:bg-[#EAE3D6] text-xs font-sans text-[#57534E] hover:text-[#1C1917] transition-colors text-center"
            >
              Select Cover Art
            </button>
          </div>

          {/* Inline Edit Details */}
          <div className="space-y-4">
            {/* Title (inline edit) */}
            <input
              id="novel-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Untitled manuscript"
              className="w-full font-serif text-3xl md:text-4xl text-[#1C1917] bg-transparent border-b border-transparent hover:border-[#E7E0D4] focus:border-[#57534E] focus:outline-none pb-1 transition-colors"
            />

            {/* Premise (one or two sentences, optional) */}
            <textarea
              id="novel-premise-input"
              value={premise}
              onChange={(e) => setPremise(e.target.value)}
              onBlur={handlePremiseBlur}
              placeholder="One-line premise (optional)"
              rows={2}
              className="w-full text-base font-serif text-[#57534E] bg-transparent border-b border-transparent hover:border-[#E7E0D4] focus:border-[#57534E] focus:outline-none resize-none pb-1 transition-colors"
            />

            {/* Discreet Row: Status & Target Length */}
            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-[#57534E]">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="uppercase tracking-wider">Status:</span>
                <div className="flex items-center border border-[#E7E0D4] rounded bg-[#FBF7F0] overflow-hidden">
                  {(['draft', 'revising', 'complete'] as NovelStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(st)}
                      className={`px-2.5 py-1 capitalize transition-colors ${
                        status === st
                          ? 'bg-[#EAE3D6] text-[#1C1917] font-medium'
                          : 'text-[#57534E] hover:text-[#1C1917]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Length */}
              <div className="flex items-center gap-2">
                <span className="uppercase tracking-wider">Target:</span>
                <input
                  id="target-length-input"
                  type="number"
                  step="1000"
                  placeholder="50000"
                  value={targetLength}
                  onChange={(e) => setTargetLength(e.target.value)}
                  onBlur={handleTargetLengthBlur}
                  className="w-24 bg-[#FBF7F0] border border-[#E7E0D4] rounded px-2 py-0.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#57534E]"
                />
                <span>words</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chapter List */}
        <section className="space-y-4 pt-4 border-t border-[#E7E0D4]/80">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xs uppercase tracking-widest text-[#57534E] font-medium">
                Chapters ({chapters.length})
              </h2>
              {chapters.length > 1 && (
                <p className="text-[11px] text-[#78716C] font-serif italic mt-0.5">
                  Drag handles to adjust chapter sequence.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                id="add-chapter-btn"
                onClick={handleAddChapter}
                title="Add chapter"
                aria-label="Add chapter"
                className="flex items-center gap-1 text-xs uppercase tracking-widest text-[#1C1917] hover:text-[#6B2D2D] transition-colors py-1 px-2 sm:px-2.5 rounded border border-[#E7E0D4] sm:border-transparent hover:border-[#6B2D2D]/30 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">Add chapter</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>

          {chapters.length === 0 ? (
            <p className="font-serif text-sm text-[#57534E] italic py-6">No chapters yet.</p>
          ) : (
            <div className="divide-y divide-[#E7E0D4]/60 border-t border-b border-[#E7E0D4]/60">
              {chapters.map((chapter, idx) => {
                const isBeingDragged = draggedChapterIndex === idx;
                const isDragOver = dragOverChapterIndex === idx;

                return (
                  <div
                    key={chapter.id}
                    id={`chapter-row-${chapter.id}`}
                    draggable
                    onDragStart={(e) => {
                      setDraggedChapterIndex(idx);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverChapterIndex !== idx) {
                        setDragOverChapterIndex(idx);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverChapterIndex === idx) {
                        setDragOverChapterIndex(null);
                      }
                    }}
                    onDragEnd={() => {
                      setDraggedChapterIndex(null);
                      setDragOverChapterIndex(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedChapterIndex !== null && draggedChapterIndex !== idx) {
                        handleMoveChapter(draggedChapterIndex, idx);
                      }
                      setDraggedChapterIndex(null);
                      setDragOverChapterIndex(null);
                    }}
                    onClick={() => {
                      onOpenChapter(chapter.id);
                    }}
                    className={`group cursor-pointer py-3.5 px-3 flex items-center justify-between transition-all rounded-md ${
                      isBeingDragged
                        ? 'opacity-30 bg-[#EAE3D6]/50'
                        : isDragOver
                        ? 'bg-[#EAE3D6] border-t-2 border-[#6B2D2D]'
                        : 'hover:bg-[#FBF7F0]'
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      {/* Drag reorder handle */}
                      <span
                        title="Drag to reposition chapter"
                        className="text-xs text-[#A8A29E] hover:text-[#1C1917] cursor-grab active:cursor-grabbing select-none font-mono p-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ⋮⋮
                      </span>

                      {/* Number and Title */}
                      <span className="font-serif text-sm text-[#57534E] w-6 flex-shrink-0">
                        {idx + 1}.
                      </span>
                      <span className="font-serif text-base text-[#1C1917] group-hover:text-[#6B2D2D] transition-colors truncate">
                        {chapter.title || `Chapter ${idx + 1}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <span className="text-xs text-[#57534E] font-mono whitespace-nowrap">
                        {(chapter.wordCount || 0).toLocaleString()} w
                      </span>

                      {/* Delete chapter button */}
                      <button
                        title="Delete chapter"
                        onClick={(e) => handleDeleteChapter(e, chapter.id)}
                        className="opacity-40 sm:opacity-0 sm:group-hover:opacity-100 text-xs text-[#57534E] hover:text-[#6B2D2D] transition-opacity p-1 cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Delete Novel Confirmation Dialog */}
        {isDeleting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/30 backdrop-blur-[2px] p-4">
            <div className="w-full max-w-sm bg-[#FBF7F0] border border-[#E7E0D4] rounded-xl p-6 space-y-4 shadow-lg paper-shadow">
              <h3 className="font-serif text-lg font-normal text-[#6B2D2D]">
                Delete manuscript permanently
              </h3>
              <p className="text-xs text-[#57534E] leading-relaxed">
                This will delete &ldquo;{folio.title}&rdquo; and all of its chapters. This action cannot be undone.
              </p>
              <div className="space-y-2">
                <label className="block text-[11px] uppercase tracking-wider text-[#57534E]">
                  Type <span className="font-semibold text-[#1C1917]">&ldquo;{folio.title}&rdquo;</span> to confirm:
                </label>
                <input
                  type="text"
                  id="delete-novel-confirm-input"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={folio.title}
                  autoFocus
                  className="w-full bg-[#F4EFE6] border border-[#E7E0D4] rounded px-3 py-2 text-sm text-[#1C1917] focus:outline-none focus:border-[#6B2D2D]"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleting(false);
                    setDeleteConfirmText('');
                  }}
                  className="text-xs uppercase tracking-wider text-[#57534E] hover:text-[#1C1917] px-3 py-1.5 rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-delete-novel-btn"
                  disabled={deleteConfirmText.trim().toLowerCase() !== folio.title.trim().toLowerCase()}
                  onClick={handleDeleteNovel}
                  className="text-xs uppercase tracking-wider bg-[#6B2D2D] hover:bg-[#582424] text-white disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium shadow-xs transition-colors cursor-pointer"
                >
                  Delete Novel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer of this view:
          total words · daily target progress as one thin bar and “842 / 1,000 today”. Nothing else. */}
      <footer className="w-full max-w-4xl mx-auto px-6 md:px-8 py-6 border-t border-[#E7E0D4]/60 text-xs text-[#57534E] flex items-center justify-between">
        <span>{totalNovelWords.toLocaleString()} total words</span>
        <div className="flex items-center gap-3">
          <div className="w-20 h-[2px] bg-[#E7E0D4] overflow-hidden rounded-full">
            <div
              className="h-full bg-[#6B2D2D]"
              style={{ width: `${targetProgress}%` }}
            />
          </div>
          <span>
            {todayWords.toLocaleString()} / {dailyTarget.toLocaleString()} today
          </span>
        </div>
      </footer>

      {/* Target slide menu */}
      <MetricsDrawer
        isOpen={isMetricsOpen}
        onClose={() => setIsMetricsOpen(false)}
        folio={folio}
        novelTotalWords={totalNovelWords}
        todayWords={todayWords}
        dailyTarget={dailyTarget}
        onUpdateFolio={updateFolioField}
      />

      {/* Novel Settings slide menu: Nested Status, Download RTF, Tools, Burgundy Delete */}
      <NovelSettingsDrawer
        isOpen={isNovelSettingsOpen}
        onClose={() => setIsNovelSettingsOpen(false)}
        folio={folio}
        onUpdateFolio={updateFolioField}
        onDuplicateNovel={handleDuplicateNovel}
        onRequestDelete={() => {
          setDeleteConfirmText('');
          setIsDeleting(true);
        }}
        onOpenGlobalSettings={onOpenSettings}
      />

      <CoverGalleryModal
        isOpen={isCoverGalleryOpen}
        onClose={() => setIsCoverGalleryOpen(false)}
        currentTitle={folio.title}
        currentCoverBlob={folio.coverBlob}
        onSelectCover={(newCover) => updateFolioField({ coverBlob: newCover })}
      />
    </div>
  );
};
