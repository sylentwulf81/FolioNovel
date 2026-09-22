'use client';

import React, { useState, useEffect } from 'react';
import { Folio, MetaSettings, DailyStat } from '@/lib/types';
import { formatRelativeDate } from '@/lib/utils-folio';
import { duplicateFolio, deleteFolio, exportNovelAsRTF, saveFolio } from '@/lib/db';
import { subscribeToGoogleAuth, syncWithDrive } from '@/lib/googleDriveSync';
import { DailyWritingChart } from './DailyWritingChart';
import { CoverGalleryModal } from './CoverGalleryModal';
import { Cloud, Settings, Plus, RefreshCw } from 'lucide-react';

interface LibraryViewProps {
  folios: Folio[];
  novelWordCounts: Record<string, number>;
  todayWords: number;
  stats: DailyStat[];
  settings: MetaSettings;
  onSelectNovel: (novelId: string) => void;
  onCreateNovel: () => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  folios,
  novelWordCounts,
  todayWords,
  stats,
  settings,
  onSelectNovel,
  onCreateNovel,
  onRefresh,
  onOpenSettings,
}) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [coverModalFolio, setCoverModalFolio] = useState<Folio | null>(null);

  // Google Drive Cloud Sync State
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [driveSyncMessage, setDriveSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToGoogleAuth((user, hasToken) => {
      setIsDriveConnected(!!user && hasToken);
    });
    return () => unsubscribe();
  }, []);

  const handleQuickSync = async () => {
    if (!isDriveConnected) {
      onOpenSettings();
      return;
    }
    setIsDriveSyncing(true);
    setDriveSyncMessage('Syncing with Google Drive…');
    try {
      const res = await syncWithDrive();
      setDriveSyncMessage(res.message);
      setTimeout(() => setDriveSyncMessage(null), 3500);
      onRefresh();
    } catch {
      setDriveSyncMessage('Sync error. Try again from Settings.');
      setTimeout(() => setDriveSyncMessage(null), 3500);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // 2px thin progress bar calculation
  const target = settings.dailyTarget || 500;
  const progressPercent = Math.min(100, Math.max(0, (todayWords / target) * 100));

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMenuOpenId(null);
    await duplicateFolio(id);
    onRefresh();
  };

  const handleExport = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setMenuOpenId(null);
    try {
      const rtf = await exportNovelAsRTF(id);
      const blob = new Blob([rtf], { type: 'application/rtf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (title || 'manuscript').toLowerCase().replace(/[^a-z0-9]/g, '-');
      a.download = `${safeTitle || 'manuscript'}.rtf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // quiet
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setDeleteConfirmId(null);
    await deleteFolio(id);
    onRefresh();
  };

  return (
    <div id="folio-library-view" className="min-h-screen flex flex-col bg-[#F4EFE6] text-[#1C1917]">
      {/* 2px thin progress bar for daily target */}
      <div className="w-full h-[2px] bg-[#E7E0D4] overflow-hidden">
        <div
          className="h-full bg-[#6B2D2D] transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Top bar */}
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-10 pt-6 sm:pt-8 pb-5 sm:pb-8 flex items-center justify-between border-b border-[#E7E0D4]/60">
        <h1
          id="folio-wordmark"
          className="font-serif text-2xl md:text-3xl font-normal tracking-wide text-[#1C1917] select-none"
        >
          Folio
        </h1>

        <div className="flex items-center gap-1.5 sm:gap-4">
          {isDriveConnected ? (
            <button
              id="header-cloud-sync-btn"
              onClick={handleQuickSync}
              disabled={isDriveSyncing}
              title="Google Drive connected · Click to sync now"
              aria-label="Google Drive sync"
              className="flex items-center gap-1.5 text-xs text-[#57534E] hover:text-[#1C1917] bg-[#EAE3D6]/70 hover:bg-[#EAE3D6] px-2 sm:px-2.5 py-1.5 rounded-md transition-colors cursor-pointer group"
            >
              {isDriveSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 text-[#D97706] animate-spin flex-shrink-0" />
              ) : (
                <div className="relative flex items-center justify-center flex-shrink-0">
                  <Cloud className="w-3.5 h-3.5 text-[#57534E] group-hover:text-[#1C1917]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A27] absolute -top-0.5 -right-0.5" />
                </div>
              )}
              <span className="font-medium text-[11px] sm:text-xs hidden sm:inline">
                {isDriveSyncing ? 'Syncing…' : 'Drive'}
              </span>
            </button>
          ) : (
            <button
              id="header-cloud-connect-btn"
              onClick={onOpenSettings}
              title="Connect Google Drive to sync across your devices"
              aria-label="Connect Google Drive"
              className="flex items-center gap-1.5 text-xs text-[#6B2D2D] hover:text-[#582424] bg-[#6B2D2D]/10 hover:bg-[#6B2D2D]/15 px-2 sm:px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[11px] sm:text-xs hidden sm:inline">Connect Drive</span>
            </button>
          )}

          <button
            id="settings-trigger-btn"
            onClick={onOpenSettings}
            title="Settings"
            aria-label="Settings"
            className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#57534E] hover:text-[#1C1917] transition-colors p-2 sm:py-1 sm:px-2 font-sans rounded hover:bg-[#EAE3D6]/60 sm:hover:bg-transparent cursor-pointer"
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            id="new-novel-btn"
            onClick={onCreateNovel}
            title="New novel"
            aria-label="New novel"
            className="flex items-center gap-1 text-xs uppercase tracking-widest text-[#1C1917] hover:text-[#6B2D2D] transition-colors p-2 sm:py-1 sm:px-2 font-sans rounded hover:bg-[#EAE3D6]/60 sm:hover:bg-transparent cursor-pointer font-medium"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">New novel</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 flex-1">
        {/* Daily Writing History Visualization (recharts) */}
        <DailyWritingChart
          stats={stats}
          dailyTarget={target}
          todayWords={todayWords}
        />

        <div className="flex items-center justify-between mb-4 sm:mb-6 pt-1 sm:pt-2">
          <h2
            id="manuscripts-shelf-title"
            className="font-serif text-lg md:text-xl font-normal text-[#1C1917] tracking-tight"
          >
            Manuscripts
          </h2>
          <span className="text-xs text-[#78716C]">
            {folios.length} {folios.length === 1 ? 'title' : 'titles'}
          </span>
        </div>

        {folios.length === 0 ? (
          /* Empty Library */
          <div
            id="empty-library-state"
            className="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-4"
          >
            <p className="font-serif text-lg text-[#57534E]">Begin a novel.</p>
            <button
              id="empty-create-novel-btn"
              onClick={onCreateNovel}
              className="text-xs uppercase tracking-widest text-[#1C1917] hover:text-[#6B2D2D] border border-[#E7E0D4] hover:border-[#57534E] px-4 py-2 rounded-md bg-[#FBF7F0] transition-colors"
            >
              New novel
            </button>
          </div>
        ) : (
          /* Grid of novel cards: compact bookshelf grid, about half size */
          <div
            id="novels-grid"
            className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-5"
          >
            {folios.map((folio) => {
              const words = novelWordCounts[folio.id] || 0;
              const formattedWords = words.toLocaleString();
              const relativeDate = formatRelativeDate(folio.updatedAt);
              const isMenuOpen = menuOpenId === folio.id;

              return (
                <div
                  key={folio.id}
                  id={`novel-card-${folio.id}`}
                  onClick={() => onSelectNovel(folio.id)}
                  className="group cursor-pointer flex flex-col space-y-1.5 sm:space-y-2 relative"
                >
                  {/* Cover container: 3:4 aspect ratio, compact half-size dimensions */}
                  <div className="relative aspect-[3/4] w-full rounded-sm sm:rounded-md overflow-hidden bg-[#EAE3D6] border border-[#E7E0D4] paper-shadow transition-transform duration-150 group-hover:-translate-y-0.5">
                    {folio.coverBlob ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={folio.coverBlob}
                        alt={folio.title}
                        className="w-full h-full object-cover select-none"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 sm:p-3 text-center bg-[#EFE9DC]">
                        <span className="font-serif text-[11px] sm:text-xs tracking-wider text-[#57534E] uppercase line-clamp-3 leading-tight">
                          {folio.title}
                        </span>
                      </div>
                    )}

                    {/* Discreet menu trigger */}
                    <button
                      aria-label="Novel options"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(isMenuOpen ? null : folio.id);
                      }}
                      className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-0.5 sm:p-1 rounded bg-[#FBF7F0]/90 text-[#57534E] hover:text-[#1C1917] shadow-xs text-[10px]"
                    >
                      ···
                    </button>

                    {/* Context menu popup */}
                    {isMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-6 sm:top-7 right-1 sm:right-1.5 z-20 w-32 bg-[#FBF7F0] border border-[#E7E0D4] rounded-md shadow-md py-1 text-xs"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(null);
                            setCoverModalFolio(folio);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F4EFE6] text-[#1C1917]"
                        >
                          Change Cover
                        </button>
                        <button
                          onClick={(e) => handleDuplicate(e, folio.id)}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F4EFE6] text-[#1C1917]"
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={(e) => handleExport(e, folio.id, folio.title)}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F4EFE6] text-[#1C1917]"
                        >
                          Export (.rtf)
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(folio.id);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F4EFE6] text-[#6B2D2D]"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Metadata */}
                  <div className="space-y-0.5">
                    <h2 className="font-serif text-xs sm:text-sm font-normal tracking-tight text-[#1C1917] truncate leading-tight" title={folio.title}>
                      {folio.title || 'Untitled manuscript'}
                    </h2>
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#57534E]">
                      <span>{formattedWords} w</span>
                      <span className="hidden xs:inline">{relativeDate}</span>
                    </div>
                  </div>

                  {/* Delete Confirmation Overlay for this card */}
                  {deleteConfirmId === folio.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 bg-[#FBF7F0]/95 backdrop-blur-[1px] rounded-lg p-4 flex flex-col justify-center items-center text-center z-30 space-y-3 border border-[#E7E0D4]"
                    >
                      <p className="text-xs text-[#1C1917] font-serif">Delete manuscript?</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleDelete(e, folio.id)}
                          className="px-3 py-1 text-xs text-[#6B2D2D] border border-[#6B2D2D]/30 rounded hover:bg-[#6B2D2D]/10"
                        >
                          Delete
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(null);
                          }}
                          className="px-3 py-1 text-xs text-[#57534E] border border-[#E7E0D4] rounded hover:bg-[#F4EFE6]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Library quiet footer status */}
      <footer className="w-full max-w-5xl mx-auto px-6 md:px-10 py-6 border-t border-[#E7E0D4]/60 text-xs text-[#57534E] flex items-center justify-between">
        <span>{folios.length} {folios.length === 1 ? 'novel' : 'novels'}</span>
        <span>{todayWords.toLocaleString()} / {target.toLocaleString()} today</span>
      </footer>

      {coverModalFolio && (
        <CoverGalleryModal
          isOpen={true}
          onClose={() => setCoverModalFolio(null)}
          currentTitle={coverModalFolio.title}
          currentCoverBlob={coverModalFolio.coverBlob}
          onSelectCover={async (newCover) => {
            await saveFolio({
              ...coverModalFolio,
              coverBlob: newCover,
              updatedAt: Date.now(),
            });
            setCoverModalFolio(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
