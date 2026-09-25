'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Download, Copy, Trash2, Sliders, Cloud, Check, Loader2 } from 'lucide-react';
import { Folio, NovelStatus } from '@/lib/types';
import { exportNovelAsRTF, exportNovelAsJSON, exportNovelAsPDF } from '@/lib/db';
import { novelPdfFileName } from '@/lib/pdfExport';

interface NovelSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  folio: Folio;
  onUpdateFolio: (patch: Partial<Folio>) => void;
  onDuplicateNovel: () => void;
  onRequestDelete: () => void;
  onOpenGlobalSettings?: () => void;
}

export const NovelSettingsDrawer: React.FC<NovelSettingsDrawerProps> = ({
  isOpen,
  onClose,
  folio,
  onUpdateFolio,
  onDuplicateNovel,
  onRequestDelete,
  onOpenGlobalSettings,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleDownloadPDF = async () => {
    try {
      setIsExporting(true);
      const bytes = await exportNovelAsPDF(folio.id);
      const copy = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(copy).set(bytes);
      const blob = new Blob([copy], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = novelPdfFileName(folio.title);
      a.click();
      URL.revokeObjectURL(url);
      setExportFeedback('Downloaded PDF');
      setTimeout(() => setExportFeedback(null), 3000);
    } catch (err) {
      console.error('PDF export error:', err);
      setExportFeedback('PDF export failed');
      setTimeout(() => setExportFeedback(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // Export as Rich Text (.rtf) - Preserves formatting (Bold, Italic, Underline, Scene breaks)
  const handleDownloadRTF = async () => {
    try {
      setIsExporting(true);
      const rtfContent = await exportNovelAsRTF(folio.id);
      const blob = new Blob([rtfContent], { type: 'application/rtf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (folio.title || 'manuscript')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');
      a.download = `${safeTitle || 'manuscript'}.rtf`;
      a.click();
      URL.revokeObjectURL(url);
      setExportFeedback('Downloaded Rich Text (.rtf)');
      setTimeout(() => setExportFeedback(null), 3000);
    } catch (err) {
      console.error('RTF export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Optional JSON format export backup
  const handleDownloadJSON = async () => {
    try {
      setIsExporting(true);
      const json = await exportNovelAsJSON(folio.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (folio.title || 'manuscript')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');
      a.download = `${safeTitle || 'manuscript'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportFeedback('Downloaded JSON backup');
      setTimeout(() => setExportFeedback(null), 3000);
    } catch {
      // quiet
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="novel-settings-drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 bg-[#1C1917]/20 backdrop-blur-[1px] flex justify-end"
        >
          <motion.div
            id="novel-settings-drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm bg-[#FBF7F0] h-full border-l border-[#E7E0D4] shadow-lg flex flex-col justify-between overflow-y-auto paper-shadow p-6 md:p-8"
          >
            <div className="space-y-7">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E7E0D4]">
                <div>
                  <h2 className="font-serif text-xl font-normal text-[#1C1917] tracking-tight">
                    Novel Settings
                  </h2>
                  <p className="text-xs text-[#57534E] truncate max-w-[200px] mt-0.5">
                    {folio.title}
                  </p>
                </div>
                <button
                  id="close-novel-settings-drawer-btn"
                  onClick={onClose}
                  className="flex items-center gap-1 text-xs uppercase tracking-widest text-[#57534E] hover:text-[#1C1917] p-1.5 sm:px-2 sm:py-1 rounded hover:bg-[#EAE3D6]/60 transition-colors cursor-pointer"
                  title="Close settings"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Close</span>
                </button>
              </div>

              {/* Status Section */}
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-widest text-[#57534E] font-medium block">
                  Manuscript Status
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F4EFE6] border border-[#E7E0D4] rounded-lg">
                  {(['draft', 'revising', 'complete'] as NovelStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => onUpdateFolio({ status: st })}
                      className={`py-1.5 text-xs capitalize rounded font-sans transition-colors cursor-pointer ${
                        folio.status === st
                          ? 'bg-[#FBF7F0] text-[#1C1917] font-medium shadow-xs border border-[#E7E0D4]'
                          : 'text-[#57534E] hover:text-[#1C1917]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manuscript Actions: Download / Export */}
              <div className="space-y-3 pt-2 border-t border-[#E7E0D4]/70">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] uppercase tracking-widest text-[#57534E] font-medium block">
                    Download & Export
                  </label>
                  {exportFeedback && (
                    <span className="text-[11px] text-[#6B2D2D] flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {exportFeedback}
                    </span>
                  )}
                </div>

                {/* Primary Download: PDF, which chat tools and editors will accept */}
                <button
                  type="button"
                  id="download-novel-pdf-btn"
                  onClick={handleDownloadPDF}
                  disabled={isExporting}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-[#F4EFE6] hover:bg-[#EAE3D6]/70 border border-[#E7E0D4] text-left transition-colors cursor-pointer group disabled:opacity-50"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-[#6B2D2D] flex-shrink-0" />
                      <span className="text-xs font-medium text-[#1C1917]">
                        Download PDF
                      </span>
                    </div>
                    <p className="text-[11px] text-[#78716C] mt-1 pl-6">
                      Readable pages for chat tools and editors. The file name includes the time of export.
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-[#78716C] bg-[#EAE3D6]/60 px-1.5 py-0.5 rounded flex-shrink-0">
                    PDF
                  </span>
                </button>

                {/* Secondary Download: Rich Text */}
                <button
                  type="button"
                  id="download-novel-rtf-btn"
                  onClick={handleDownloadRTF}
                  disabled={isExporting}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-[#EAE3D6]/40 text-left transition-colors cursor-pointer group disabled:opacity-50 text-xs text-[#57534E] hover:text-[#1C1917]"
                >
                  <span className="text-xs">Download Rich Text (.rtf)</span>
                  <span className="text-[10px] text-[#78716C]">.rtf</span>
                </button>

                {/* Secondary Download: JSON Raw Backup */}
                <button
                  type="button"
                  id="download-novel-json-btn"
                  onClick={handleDownloadJSON}
                  disabled={isExporting}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-[#EAE3D6]/40 text-left transition-colors cursor-pointer group disabled:opacity-50 text-xs text-[#57534E] hover:text-[#1C1917]"
                >
                  <span className="text-xs">Download raw JSON backup</span>
                  <span className="text-[10px] text-[#78716C]">.json</span>
                </button>
              </div>

              {/* Novel Management: Duplicate & App Settings */}
              <div className="space-y-2 pt-2 border-t border-[#E7E0D4]/70">
                <label className="text-[11px] uppercase tracking-widest text-[#57534E] font-medium block">
                  Manuscript Tools
                </label>

                <button
                  type="button"
                  id="duplicate-novel-drawer-btn"
                  onClick={() => {
                    onClose();
                    onDuplicateNovel();
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-[#EAE3D6]/60 text-xs text-[#1C1917] transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-[#57534E] flex-shrink-0" />
                  <span>Duplicate this manuscript</span>
                </button>

                {onOpenGlobalSettings && (
                  <button
                    type="button"
                    id="open-app-settings-from-drawer-btn"
                    onClick={() => {
                      onClose();
                      onOpenGlobalSettings();
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-[#EAE3D6]/60 text-xs text-[#1C1917] transition-colors cursor-pointer"
                  >
                    <Sliders className="w-4 h-4 text-[#57534E] flex-shrink-0" />
                    <span>Global App Settings & Cloud Backup</span>
                  </button>
                )}
              </div>

              {/* Danger Zone: Delete Novel in burgundy / crimson button */}
              <div className="pt-4 border-t border-[#E7E0D4]/70 space-y-2">
                <label className="text-[11px] uppercase tracking-widest text-[#6B2D2D] font-medium block">
                  Danger Zone
                </label>
                <button
                  type="button"
                  id="delete-novel-drawer-trigger-btn"
                  onClick={() => {
                    onClose();
                    onRequestDelete();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#6B2D2D] hover:bg-[#582424] text-white text-xs uppercase tracking-wider font-medium shadow-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 flex-shrink-0" />
                  <span>Delete Novel</span>
                </button>
                <p className="text-[11px] text-[#78716C] text-center">
                  Requires confirmation by typing the manuscript title.
                </p>
              </div>
            </div>

            {/* Bottom info */}
            <div className="pt-4 border-t border-[#E7E0D4]/50 text-center">
              <span className="text-[10px] text-[#78716C] tracking-wider uppercase font-serif">
                Folio Ink Studio
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
