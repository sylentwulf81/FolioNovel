'use client';

import React, { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MetaSettings } from '@/lib/types';
import { exportAllData, importData, saveMeta } from '@/lib/db';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { GoogleDriveSyncSection } from './GoogleDriveSyncSection';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: MetaSettings;
  onSettingsUpdated: (updated: MetaSettings) => void;
  onDataImported: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsUpdated,
  onDataImported,
}) => {
  const [dailyTarget, setDailyTarget] = useState(settings.dailyTarget);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSHint, setShowIOSHint] = useState(false);

  const handleTargetChange = async (val: number) => {
    const clean = Math.max(10, Math.min(50000, isNaN(val) ? 500 : val));
    setDailyTarget(clean);
    await saveMeta({ dailyTarget: clean });
    onSettingsUpdated({ ...settings, dailyTarget: clean });
  };

  const handleExport = async () => {
    try {
      const json = await exportAllData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `folio-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // quiet failure
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus('Importing…');
      const text = await file.text();
      await importData(text);
      setImportStatus('Data restored.');
      onDataImported();
      setTimeout(() => {
        setImportStatus(null);
        onClose();
      }, 900);
    } catch {
      setImportStatus('Unable to parse file.');
      setTimeout(() => setImportStatus(null), 2500);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="settings-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/20 backdrop-blur-[2px] p-4"
        >
          <motion.div
            id="settings-modal-card"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md bg-[#FBF7F0] border border-[#E7E0D4] rounded-xl p-6 md:p-8 shadow-sm paper-shadow"
          >
        <div className="flex items-center justify-between pb-5 border-b border-[#E7E0D4]">
          <h2 className="font-serif text-xl font-medium tracking-tight text-[#1C1917]">Settings</h2>
          <button
            id="close-settings-btn"
            onClick={onClose}
            className="text-sm text-[#57534E] hover:text-[#1C1917] transition-colors py-1 px-2"
          >
            Close
          </button>
        </div>

        <div className="py-6 space-y-6">
          {/* Daily Word Target */}
          <div>
            <label htmlFor="daily-target-input" className="block text-xs uppercase tracking-wider text-[#57534E] mb-2 font-medium">
              Daily word target
            </label>
            <div className="flex items-center gap-3">
              <input
                id="daily-target-input"
                type="number"
                min="10"
                step="50"
                value={dailyTarget}
                onChange={(e) => handleTargetChange(parseInt(e.target.value, 10))}
                className="w-32 bg-[#F4EFE6] border border-[#E7E0D4] rounded-md px-3 py-1.5 text-base font-serif text-[#1C1917] focus:outline-none focus:border-[#57534E]"
              />
              <span className="text-sm text-[#57534E]">words / day</span>
            </div>
          </div>

          {/* Cloud Multi-Device Sync (Google Drive) */}
          <GoogleDriveSyncSection onSyncCompleted={onDataImported} />

          {/* Backup / Export / Import */}
          <div className="pt-2 border-t border-[#E7E0D4]">
            <label className="block text-xs uppercase tracking-wider text-[#57534E] mb-3 font-medium">
              Data & Archives
            </label>
            <div className="flex items-center gap-3">
              <button
                id="export-all-btn"
                onClick={handleExport}
                className="text-xs uppercase tracking-wider px-3.5 py-2 border border-[#E7E0D4] hover:border-[#57534E] text-[#1C1917] rounded-md bg-[#F4EFE6] transition-colors"
              >
                Export all
              </button>
              <button
                id="import-backup-btn"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs uppercase tracking-wider px-3.5 py-2 border border-[#E7E0D4] hover:border-[#57534E] text-[#1C1917] rounded-md bg-[#F4EFE6] transition-colors"
              >
                Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {importStatus && (
              <p className="mt-2 text-xs text-[#57534E] font-serif italic">{importStatus}</p>
            )}
          </div>

          {/* PWA Installation */}
          {!isInstalled && (
            <div className="pt-2 border-t border-[#E7E0D4]">
              <label className="block text-xs uppercase tracking-wider text-[#57534E] mb-2 font-medium">
                Offline Studio
              </label>
              {isInstallable ? (
                <button
                  id="install-pwa-app-btn"
                  onClick={install}
                  className="text-xs uppercase tracking-wider px-3.5 py-2 border border-[#E7E0D4] hover:border-[#57534E] text-[#1C1917] rounded-md bg-[#F4EFE6] transition-colors"
                >
                  Install Folio
                </button>
              ) : isIOS ? (
                <div>
                  <button
                    onClick={() => setShowIOSHint(!showIOSHint)}
                    className="text-xs text-[#57534E] hover:text-[#1C1917] underline underline-offset-4"
                  >
                    Install on iOS
                  </button>
                  {showIOSHint && (
                    <p className="mt-2 text-xs text-[#57534E] leading-relaxed">
                      Tap the Share icon in Safari, then select &ldquo;Add to Home Screen&rdquo;.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#57534E]">
                  Available offline via cached service worker.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-[#E7E0D4] flex justify-end">
          <button
            id="done-settings-btn"
            onClick={onClose}
            className="text-xs uppercase tracking-wider text-[#1C1917] font-medium hover:text-[#6B2D2D] transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};
