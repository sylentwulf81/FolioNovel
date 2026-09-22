'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { COVER_TEMPLATES } from '@/lib/covers';

interface CoverGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTitle: string;
  currentCoverBlob?: string;
  onSelectCover: (coverBlob: string) => void;
}

export const CoverGalleryModal: React.FC<CoverGalleryModalProps> = ({
  isOpen,
  onClose,
  currentTitle,
  currentCoverBlob,
  onSelectCover,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('desert-dunes');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const displayTitle = currentTitle.trim() || 'UNTITLED MANUSCRIPT';

  const handleApply = () => {
    const template = COVER_TEMPLATES.find((t) => t.id === selectedTemplateId) || COVER_TEMPLATES[0];
    const svg = template.generate(displayTitle);
    onSelectCover(svg);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="cover-gallery-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/45 backdrop-blur-[2px] p-2 sm:p-4 md:p-6"
          onClick={onClose}
        >
          <motion.div
            id="cover-gallery-modal-card"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl bg-[#FAF6EE] border border-[#E7E0D4] rounded-xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[90vh]"
          >
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[#E7E0D4] flex items-center justify-between bg-[#F4EFE6]/60 flex-shrink-0">
          <div className="pr-2">
            <h2
              id="cover-gallery-title"
              className="font-serif text-base sm:text-xl text-[#1C1917] font-medium tracking-tight"
            >
              Select Cover Artwork
            </h2>
            <p className="text-[11px] sm:text-xs text-[#78716C] mt-0.5 line-clamp-1 sm:line-clamp-none">
              Choose from minimalist literary landscape covers for your manuscript
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[#78716C] hover:text-[#1C1917] hover:bg-[#EAE3D6] transition-colors flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Gallery Grid */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 min-h-0">
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4">
              {COVER_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                const previewSvg = tmpl.generate(displayTitle);

                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(tmpl.id);
                    }}
                    onDoubleClick={() => {
                      const svg = tmpl.generate(displayTitle);
                      onSelectCover(svg);
                      onClose();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const svg = tmpl.generate(displayTitle);
                        onSelectCover(svg);
                        onClose();
                      }
                    }}
                    className={`group relative text-left rounded-lg sm:rounded-xl p-1.5 sm:p-2 transition-all flex flex-col focus:outline-none focus:ring-2 focus:ring-[#6B2D2D]/60 ${
                      isSelected
                        ? 'bg-[#EAE3D6] ring-2 ring-[#6B2D2D]'
                        : 'hover:bg-[#F2ECE1] border border-transparent'
                    }`}
                  >
                    {/* 3:4 aspect ratio thumbnail */}
                    <div className="relative aspect-[3/4] w-full rounded-md sm:rounded-lg overflow-hidden border border-[#E0D8C8] shadow-xs bg-[#EFE9DC]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewSvg}
                        alt={tmpl.name}
                        className="w-full h-full object-cover select-none pointer-events-none"
                      />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-[#6B2D2D] text-[#FBF7F0] w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[10px] sm:text-xs shadow-sm">
                          ✓
                        </div>
                      )}
                    </div>
                    <div className="mt-1.5 sm:mt-2.5 px-0.5">
                      <p className="text-[11px] sm:text-xs font-medium text-[#1C1917] truncate">{tmpl.name}</p>
                      <p className="text-[10px] sm:text-[11px] text-[#78716C] line-clamp-1 mt-0.5">
                        {tmpl.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 sm:px-6 sm:py-3.5 border-t border-[#E7E0D4] bg-[#F4EFE6]/60 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs text-[#78716C] hover:text-[#1C1917] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-md sm:rounded-lg bg-[#6B2D2D] hover:bg-[#582424] text-[#FAF6EE] text-xs font-medium tracking-wide shadow-sm transition-colors"
          >
            Apply Cover
          </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};
