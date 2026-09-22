'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Target, Calendar, BookOpen } from 'lucide-react';
import { Folio } from '@/lib/types';

interface MetricsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  folio: Folio;
  chapterTitle?: string;
  chapterWordCount?: number;
  novelTotalWords: number;
  todayWords: number;
  dailyTarget: number;
  onUpdateFolio?: (patch: Partial<Folio>) => void;
}

export const MetricsDrawer: React.FC<MetricsDrawerProps> = ({
  isOpen,
  onClose,
  folio,
  chapterTitle,
  chapterWordCount,
  novelTotalWords,
  todayWords,
  dailyTarget,
  onUpdateFolio,
}) => {
  const [targetLength, setTargetLength] = useState<string>(
    folio.targetLength ? String(folio.targetLength) : '50000'
  );
  const [deadline, setDeadline] = useState<string>(folio.deadline || '');

  // Handle Escape key to dismiss drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const targetNum = parseInt(targetLength, 10) || 50000;
  const wordsRemainingToTarget = Math.max(0, targetNum - novelTotalWords);
  const targetProgressPercent = Math.min(100, Math.max(0, (novelTotalWords / targetNum) * 100));

  // Today's target calculations
  const todayProgressPercent = Math.min(100, Math.max(0, (todayWords / dailyTarget) * 100));
  const wordsNeededToday = Math.max(0, dailyTarget - todayWords);

  // Reading time (~250 words per minute)
  const readingTimeMin = Math.max(1, Math.round(novelTotalWords / 250));

  // Deadline calculations
  let daysLeft: number | null = null;
  let wordsPerDayNeeded: number | null = null;

  if (deadline) {
    const targetDate = new Date(deadline + 'T23:59:59');
    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    daysLeft = diffDays;

    if (diffDays > 0) {
      wordsPerDayNeeded = Math.ceil(wordsRemainingToTarget / diffDays);
    } else {
      wordsPerDayNeeded = wordsRemainingToTarget;
    }
  }

  const handleTargetBlur = () => {
    const parsed = parseInt(targetLength, 10);
    const clean = isNaN(parsed) || parsed <= 0 ? undefined : parsed;
    if (onUpdateFolio && clean !== folio.targetLength) {
      onUpdateFolio({ targetLength: clean });
    }
  };

  const handleDeadlineChange = (val: string) => {
    setDeadline(val);
    if (onUpdateFolio) {
      onUpdateFolio({ deadline: val || undefined });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="metrics-drawer-backdrop"
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
            id="metrics-drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm bg-[#FBF7F0] h-full border-l border-[#E7E0D4] shadow-lg flex flex-col justify-between overflow-y-auto paper-shadow p-6 md:p-8"
          >
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E7E0D4]">
            <div>
              <h2 className="font-serif text-xl font-normal text-[#1C1917] tracking-tight">
                Progress & Target
              </h2>
              <p className="text-xs text-[#57534E] truncate max-w-[200px] mt-0.5">
                {folio.title}
              </p>
            </div>
            <button
              id="close-metrics-drawer-btn"
              onClick={onClose}
              className="flex items-center gap-1 text-xs uppercase tracking-widest text-[#57534E] hover:text-[#1C1917] p-1.5 sm:px-2 sm:py-1 rounded hover:bg-[#EAE3D6]/60 transition-colors"
              title="Close drawer"
              aria-label="Close"
            >
              <X className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>

          {/* Current Counts */}
          <div className="space-y-4">
            <h3 className="text-[11px] uppercase tracking-widest text-[#57534E] font-medium flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#78716C]" />
              <span>Word Count</span>
            </h3>
            <div className="bg-[#F4EFE6] border border-[#E7E0D4] rounded-lg p-4 space-y-3">
              {chapterWordCount !== undefined && (
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-[#57534E] truncate max-w-[160px]">
                    {chapterTitle || 'Current chapter'}
                  </span>
                  <span className="font-serif text-base text-[#1C1917]">
                    {chapterWordCount.toLocaleString()} words
                  </span>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-[#E7E0D4]/60 pt-2">
                <span className="text-xs text-[#57534E]">Novel total</span>
                <span className="font-serif text-lg text-[#1C1917]">
                  {novelTotalWords.toLocaleString()} words
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs text-[#57534E]">
                <span>Estimated reading</span>
                <span>~{readingTimeMin} min read</span>
              </div>
            </div>
          </div>

          {/* Target & Words Needed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] uppercase tracking-widest text-[#57534E] font-medium flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#78716C]" />
                <span>Manuscript Target</span>
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-[#57534E]">
                <input
                  id="drawer-target-length-input"
                  type="number"
                  step="1000"
                  value={targetLength}
                  onChange={(e) => setTargetLength(e.target.value)}
                  onBlur={handleTargetBlur}
                  className="w-20 bg-[#F4EFE6] border border-[#E7E0D4] rounded px-2 py-0.5 text-right font-mono text-xs text-[#1C1917] focus:outline-none focus:border-[#57534E]"
                />
                <span>words</span>
              </div>
            </div>

            {/* Thin 2px progress bar */}
            <div className="w-full h-[2px] bg-[#E7E0D4] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#6B2D2D] transition-all duration-200"
                style={{ width: `${targetProgressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[#57534E] pt-1">
              <span>
                {wordsRemainingToTarget > 0
                  ? `${wordsRemainingToTarget.toLocaleString()} words remaining`
                  : 'Target reached'}
              </span>
              <span>{Math.round(targetProgressPercent)}%</span>
            </div>
          </div>

          {/* Deadline & Pace Calculation */}
          <div className="space-y-4 pt-2 border-t border-[#E7E0D4]/80">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] uppercase tracking-widest text-[#57534E] font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#78716C]" />
                <span>Deadline & Pace</span>
              </h3>
              <input
                id="drawer-deadline-input"
                type="date"
                value={deadline}
                onChange={(e) => handleDeadlineChange(e.target.value)}
                className="bg-[#F4EFE6] border border-[#E7E0D4] rounded px-2 py-0.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#57534E]"
              />
            </div>

            {deadline ? (
              <div className="bg-[#F4EFE6] border border-[#E7E0D4] rounded-lg p-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-[#57534E]">Time remaining</span>
                  <span className="text-xs font-medium text-[#1C1917]">
                    {daysLeft !== null && daysLeft > 0
                      ? `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`
                      : daysLeft === 0
                      ? 'Due today'
                      : 'Deadline passed'}
                  </span>
                </div>

                {wordsRemainingToTarget > 0 && daysLeft !== null && daysLeft > 0 && (
                  <div className="flex items-baseline justify-between border-t border-[#E7E0D4]/60 pt-2">
                    <span className="text-xs text-[#57534E]">Required daily pace</span>
                    <span className="font-serif text-base text-[#6B2D2D]">
                      {wordsPerDayNeeded?.toLocaleString()} words / day
                    </span>
                  </div>
                )}

                {wordsRemainingToTarget === 0 && (
                  <p className="text-xs text-[#57534E] italic font-serif">
                    Manuscript target already achieved before deadline.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#57534E] leading-relaxed">
                Set an optional deadline to calculate how many words per day are needed to complete the manuscript.
              </p>
            )}
          </div>

          {/* Today's Goal Progress */}
          <div className="space-y-3 pt-2 border-t border-[#E7E0D4]/80">
            <h3 className="text-[11px] uppercase tracking-widest text-[#57534E] font-medium">
              Today&apos;s Output
            </h3>
            <div className="w-full h-[2px] bg-[#E7E0D4] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#6B2D2D] transition-all duration-200"
                style={{ width: `${todayProgressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-[#57534E]">
              <span>
                {todayWords.toLocaleString()} / {dailyTarget.toLocaleString()} today
              </span>
              <span>
                {wordsNeededToday > 0
                  ? `${wordsNeededToday.toLocaleString()} left`
                  : 'Daily goal met'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-[#E7E0D4] flex justify-between items-center text-[11px] text-[#57534E]">
          <span>Quiet mode</span>
          <button
            onClick={onClose}
            className="uppercase tracking-widest text-[#1C1917] hover:text-[#6B2D2D] transition-colors"
          >
            Dismiss
          </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};
