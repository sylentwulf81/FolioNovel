'use client';

import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Chapter, Folio, BlockNode } from '@/lib/types';
import { countBlocksWordCount, countWords } from '@/lib/utils-folio';
import { saveChapter, getChapter, getChaptersForNovel } from '@/lib/db';
import { hasActiveAccessToken, syncWithDrive } from '@/lib/googleDriveSync';
import { MetricsDrawer } from './MetricsDrawer';
import { ArrowLeft, Bold, Italic, Underline } from 'lucide-react';

interface PageViewProps {
  folio: Folio;
  chapterId: string;
  chapters?: Chapter[];
  todayWords: number;
  dailyTarget?: number;
  onBackToNovel: () => void;
  onChapterUpdated: () => void;
  onSelectChapter?: (chapterId: string) => void;
  onUpdateFolio?: (patch: Partial<Folio>) => void;
}

interface BubblePosition {
  top: number;
  left: number;
  visible: boolean;
}

export const PageView: React.FC<PageViewProps> = ({
  folio,
  chapterId,
  chapters,
  todayWords,
  dailyTarget = 500,
  onBackToNovel,
  onChapterUpdated,
  onSelectChapter,
  onUpdateFolio,
}) => {
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterWordCount, setChapterWordCount] = useState(0);
  const [baselineWordCount, setBaselineWordCount] = useState(0);
  const [otherChaptersWordCount, setOtherChaptersWordCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | null>('saved');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const hasMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Monitor virtual keyboard height on iOS Safari & mobile browsers without jitter
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateKeyboard = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setKeyboardInset(0);
        return;
      }
      // On platforms where layout viewport does not automatically shrink (e.g. iOS Safari):
      // visualViewport.height shrinks while window.innerHeight remains full screen height.
      const diff = Math.round(window.innerHeight - vv.height);
      if (diff > 50) {
        setKeyboardInset(diff);
      } else {
        setKeyboardInset(0);
      }
    };

    const vv = window.visualViewport;
    if (vv) {
      // HIG / UX requirement:
      // Listen ONLY to 'resize' when keyboard opens/closes/rotates, NEVER 'scroll'.
      // This ensures the toolbar never moves or snaps back when scrolling text.
      vv.addEventListener('resize', updateKeyboard);
    }
    window.addEventListener('resize', updateKeyboard);
    updateKeyboard();

    return () => {
      if (vv) {
        vv.removeEventListener('resize', updateKeyboard);
      }
      window.removeEventListener('resize', updateKeyboard);
    };
  }, []);

  const editorRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const focusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialWordCountRef = useRef<number>(0);
  const isDirtyRef = useRef(false);

  // Load chapter content
  useEffect(() => {
    let mounted = true;
    getChapter(chapterId).then((data) => {
      if (!mounted) return;
      if (data) {
        setChapter(data);
        setChapterTitle(data.title);
        setChapterWordCount(data.wordCount);
        setBaselineWordCount(data.wordCount);
        initialWordCountRef.current = data.wordCount;
      }
    });
    return () => {
      mounted = false;
    };
  }, [chapterId]);

  // Load word count of other chapters in the novel
  useEffect(() => {
    let mounted = true;
    getChaptersForNovel(folio.id).then((chaps) => {
      if (!mounted) return;
      const sum = chaps
        .filter((c) => c.id !== chapterId)
        .reduce((total, c) => total + (c.wordCount || 0), 0);
      setOtherChaptersWordCount(sum);
    });
    return () => {
      mounted = false;
    };
  }, [folio.id, chapterId]);

  const novelTotalWords = otherChaptersWordCount + chapterWordCount;

  // Live daily progress tracking
  const cleanDailyTarget = dailyTarget && dailyTarget > 0 ? dailyTarget : 500;
  const liveWordDelta = Math.max(0, chapterWordCount - baselineWordCount);
  const liveTodayWords = todayWords + liveWordDelta;
  const dailyProgressPercent = Math.min(100, Math.max(0, (liveTodayWords / cleanDailyTarget) * 100));

  // Prevent accidental close if unsaved buffer
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Initialize editor HTML from structured BlockNode[]
  useEffect(() => {
    if (!editorRef.current || !chapter) return;

    // Only set initial HTML if editor is empty
    if (editorRef.current.innerHTML.trim() === '') {
      const html = chapter.content
        .map((block) => {
          if (block.type === 'sceneBreak') {
            return `<div data-type="sceneBreak" contenteditable="false" class="folio-scene-break">· · ·</div>`;
          }
          return `<p>${block.html || '<br>'}</p>`;
        })
        .join('');

      editorRef.current.innerHTML = html || '<p><br></p>';
    }
  }, [chapter]);

  // Convert current DOM to structured BlockNode[]
  const parseEditorBlocks = useCallback((): { blocks: BlockNode[]; wordCount: number } => {
    if (!editorRef.current) return { blocks: [], wordCount: 0 };

    const blocks: BlockNode[] = [];
    const children = Array.from(editorRef.current.children);

    if (children.length === 0 && editorRef.current.textContent?.trim()) {
      // Fallback if plain text was entered
      const text = editorRef.current.textContent.trim();
      blocks.push({
        id: 'b-' + Date.now(),
        type: 'paragraph',
        html: text,
        text,
      });
    } else {
      children.forEach((el, index) => {
        const isSceneBreak =
          el.getAttribute('data-type') === 'sceneBreak' ||
          el.classList.contains('folio-scene-break') ||
          el.textContent?.trim() === '· · ·';

        if (isSceneBreak) {
          blocks.push({
            id: el.getAttribute('data-block-id') || `sb-${index}-${Date.now()}`,
            type: 'sceneBreak',
          });
        } else {
          const html = el.innerHTML;
          const text = el.textContent || '';
          blocks.push({
            id: el.getAttribute('data-block-id') || `p-${index}-${Date.now()}`,
            type: 'paragraph',
            html,
            text,
          });
        }
      });
    }

    if (blocks.length === 0) {
      blocks.push({
        id: 'p-' + Date.now(),
        type: 'paragraph',
        html: '',
        text: '',
      });
    }

    const wordCount = countBlocksWordCount(blocks);
    return { blocks, wordCount };
  }, []);

  // Perform actual save to IndexedDB
  const executeSave = useCallback(
    async (manualFlash: boolean = false) => {
      if (!chapter) return;
      const { blocks, wordCount } = parseEditorBlocks();

      setSaveStatus('saving');
      const updatedChapter: Chapter = {
        ...chapter,
        title: chapterTitle.trim() || 'Untitled Chapter',
        content: blocks,
        wordCount,
        updatedAt: Date.now(),
      };

      await saveChapter(updatedChapter, initialWordCountRef.current);
      initialWordCountRef.current = wordCount; // Update baseline after delta saved
      setBaselineWordCount(wordCount);
      setChapter(updatedChapter);
      setChapterWordCount(wordCount);
      isDirtyRef.current = false;
      setSaveStatus('saved');
      onChapterUpdated();

      if (manualFlash) {
        // Flash "Saved."
        setSaveStatus('saved');
      }
    },
    [chapter, chapterTitle, parseEditorBlocks, onChapterUpdated]
  );

  // Trigger autosave (800ms debounce after typing stops)
  const triggerAutosave = useCallback(() => {
    isDirtyRef.current = true;
    setSaveStatus('saving');

    // Update live word count immediately for real-time responsiveness
    if (editorRef.current) {
      const text = editorRef.current.textContent || '';
      const liveWords = countWords(text);
      setChapterWordCount(liveWords);
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      executeSave(false);
    }, 800);
  }, [executeSave]);

  // Insert a decorative scene break ornament block
  const insertSceneBreak = useCallback(() => {
    setIsEditing(true);
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    range.deleteContents();

    const sceneBreakEl = document.createElement('div');
    sceneBreakEl.setAttribute('data-type', 'sceneBreak');
    sceneBreakEl.setAttribute('contenteditable', 'false');
    sceneBreakEl.className = 'folio-scene-break';
    sceneBreakEl.textContent = '· · ·';

    const pAfter = document.createElement('p');
    pAfter.innerHTML = '<br>';

    // Find nearest block container inside editor
    let currentBlock: Node | null = range.startContainer;
    while (currentBlock && currentBlock.parentNode !== editorRef.current) {
      currentBlock = currentBlock.parentNode;
    }

    if (currentBlock && editorRef.current?.contains(currentBlock)) {
      currentBlock.parentNode?.insertBefore(sceneBreakEl, currentBlock.nextSibling);
      currentBlock.parentNode?.insertBefore(pAfter, sceneBreakEl.nextSibling);
    } else if (editorRef.current) {
      editorRef.current.appendChild(sceneBreakEl);
      editorRef.current.appendChild(pAfter);
    }

    // Move cursor into the empty paragraph after scene break
    const newRange = document.createRange();
    newRange.setStart(pAfter, 0);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    savedRangeRef.current = newRange.cloneRange();

    triggerAutosave();
  }, [triggerAutosave]);

  // Keep track of active formatting states and saved selection range
  const updateActiveFormats = useCallback(() => {
    try {
      const sel = window.getSelection();
      if (!sel || !editorRef.current) return;
      if (editorRef.current.contains(sel.anchorNode)) {
        setIsEditing(true);
        if (sel.rangeCount > 0) {
          savedRangeRef.current = sel.getRangeAt(0).cloneRange();
        }
        setActiveFormats({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
        });
      }
    } catch {
      // document.queryCommandState might throw if not editable
    }
  }, []);

  // Listen to selectionchange across the document: present pill when caret/selection is inside editor
  useEffect(() => {
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && sel.anchorNode && editorRef.current?.contains(sel.anchorNode)) {
        setIsEditing(true);
        updateActiveFormats();
      }
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [updateActiveFormats]);

  // When user blurs editor, hide pill unless interaction is with the pill itself
  const handleEditorBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as Node | null;
    if (pillRef.current && (pillRef.current === related || pillRef.current.contains(related))) {
      return;
    }
    setTimeout(() => {
      const activeEl = document.activeElement;
      const sel = window.getSelection();
      const caretInEditor = sel && sel.anchorNode && editorRef.current?.contains(sel.anchorNode);
      if (!caretInEditor && activeEl !== editorRef.current) {
        setIsEditing(false);
      }
    }, 150);
  };

  // Format selection or current caret: bold, italic, or underline
  const handleFormat = useCallback(
    (command: 'bold' | 'italic' | 'underline') => {
      setIsEditing(true);
      if (editorRef.current) {
        if (document.activeElement !== editorRef.current) {
          editorRef.current.focus();
        }
        if (savedRangeRef.current) {
          const sel = window.getSelection();
          if (sel && (!editorRef.current.contains(sel.anchorNode) || sel.rangeCount === 0)) {
            try {
              sel.removeAllRanges();
              sel.addRange(savedRangeRef.current);
            } catch {
              // Ignore range error
            }
          }
        }
      }
      document.execCommand(command, false);
      updateActiveFormats();
      triggerAutosave();
    },
    [updateActiveFormats, triggerAutosave]
  );

  // Keyboard shortcuts and focus mode management
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isMeta = e.metaKey || e.ctrlKey;

    // Reset or start focus mode timer: hide chrome after 2s of typing
    if (!isFocusMode) {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      focusTimerRef.current = setTimeout(() => {
        setIsFocusMode(true);
      }, 2000);
    }

    // Escape: exit focus mode immediately
    if (e.key === 'Escape') {
      setIsFocusMode(false);
      return;
    }

    // Cmd/Ctrl + S: trigger save & flash "Saved."
    if (isMeta && e.key.toLowerCase() === 's') {
      e.preventDefault();
      executeSave(true);
      return;
    }

    // Cmd/Ctrl + Enter: insert scene break
    if (isMeta && e.key === 'Enter') {
      e.preventDefault();
      insertSceneBreak();
      return;
    }

    // Cmd/Ctrl + B: Bold
    if (isMeta && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      handleFormat('bold');
      return;
    }

    // Cmd/Ctrl + I: Italic
    if (isMeta && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      handleFormat('italic');
      return;
    }

    // Cmd/Ctrl + U: Underline
    if (isMeta && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      handleFormat('underline');
      return;
    }
  };

  // Mouse move: reveal chrome when in focus mode
  const handleMouseMove = () => {
    if (isFocusMode) {
      setIsFocusMode(false);
    }
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChapterTitle(e.target.value);
    triggerAutosave();
  };

  // Click on scene-break to select or remove
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.getAttribute('data-type') === 'sceneBreak' ||
      target.classList.contains('folio-scene-break')
    ) {
      // If user clicked the ornament, they can select it or delete it
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNode(target);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  };

  const currentChapterIndex = chapters ? chapters.findIndex((c) => c.id === chapterId) : -1;

  return (
    <div
      id="folio-page-editor"
      onMouseMove={handleMouseMove}
      className="min-h-screen flex flex-col bg-[#F4EFE6] text-[#1C1917] selection:bg-[#E7E0D4] selection:text-[#1C1917]"
    >
      {/* Visual daily progress bar across the top of the writing view */}
      <div
        id="pageview-progress-bar-container"
        className={`w-full h-[2.5px] bg-[#E7E0D4] overflow-hidden transition-opacity duration-200 ${
          isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        title={`Daily Target: ${liveTodayWords.toLocaleString()} / ${cleanDailyTarget.toLocaleString()} words (${Math.round(dailyProgressPercent)}%)`}
      >
        <div
          id="pageview-progress-bar-fill"
          className={`h-full transition-all duration-300 ease-out ${
            dailyProgressPercent >= 100 ? 'bg-[#2D5A27]' : 'bg-[#6B2D2D]'
          }`}
          style={{ width: `${dailyProgressPercent}%` }}
        />
      </div>

      {/* Top Chrome: Back to novel, Chapter title (inline), Save indicator, Target progress */}
      <header
        className={`w-full max-w-4xl mx-auto px-6 md:px-8 pt-8 pb-4 flex items-center justify-between transition-opacity duration-200 ${
          isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <button
          id="back-to-novel-btn"
          onClick={async () => {
            await executeSave();
            if (hasActiveAccessToken()) {
              syncWithDrive().catch(() => {});
            }
            onBackToNovel();
          }}
          title={`Back to ${folio.title || 'Novel'}`}
          aria-label={`Back to ${folio.title || 'Novel'}`}
          className="text-xs uppercase tracking-widest text-[#57534E] hover:text-[#1C1917] transition-colors flex items-center gap-1.5 py-1 px-1 sm:px-1.5 rounded hover:bg-[#EAE3D6]/50 sm:hover:bg-transparent cursor-pointer flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4 flex-shrink-0" />
          <span className="truncate max-w-[80px] xs:max-w-[120px] sm:max-w-[180px] md:max-w-[220px]">
            {folio.title || 'Novel'}
          </span>
        </button>

        {/* Inline Chapter Title & Position */}
        <div className="flex flex-col items-center max-w-[200px] xs:max-w-[260px] sm:max-w-[340px] md:max-w-[420px] px-1">
          <input
            id="chapter-title-input"
            type="text"
            value={chapterTitle}
            onChange={handleTitleChange}
            onBlur={() => executeSave()}
            placeholder="Chapter Title"
            className="font-serif text-base sm:text-lg md:text-xl text-center text-[#1C1917] bg-transparent border-b border-transparent hover:border-[#E7E0D4] focus:border-[#57534E] focus:outline-none px-1.5 py-0.5 w-full transition-colors truncate"
          />
          {chapters && chapters.length > 0 && currentChapterIndex !== -1 && (
            <span className="text-[10px] uppercase tracking-widest text-[#78716C] font-sans select-none mt-0.5 whitespace-nowrap">
              Chapter {currentChapterIndex + 1} of {chapters.length}
            </span>
          )}
        </div>

        {/* Quiet Save indicator & Daily Target Circular Progress Indicator */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-3 text-xs text-[#57534E] font-sans flex-shrink-0">
          <span className="min-w-[36px] sm:min-w-[44px] text-right text-[11px] sm:text-xs">
            {saveStatus === 'saving' ? (
              <span className="italic text-[#57534E]/70">Saving…</span>
            ) : (
              <span className="text-[#57534E]/90 hidden xs:inline">Saved.</span>
            )}
          </span>
          <button
            id="editor-metrics-btn"
            onClick={() => setIsMetricsOpen(true)}
            title={`Daily Target: ${liveTodayWords.toLocaleString()} / ${cleanDailyTarget.toLocaleString()} words (${Math.round(dailyProgressPercent)}%)`}
            aria-label="View target metrics"
            className="group flex items-center gap-1.5 py-1 px-1.5 sm:px-2 rounded-md hover:bg-[#EAE3D6]/70 transition-colors text-xs text-[#57534E] hover:text-[#1C1917] cursor-pointer"
          >
            {/* Circular indicator that fills up as user approaches daily target */}
            <div
              id="header-circular-indicator"
              className="relative w-4 h-4 flex items-center justify-center flex-shrink-0"
              aria-label={`Daily target progress: ${Math.round(dailyProgressPercent)}%`}
            >
              <svg className="w-4 h-4 -rotate-90" viewBox="0 0 20 20">
                <circle
                  cx="10"
                  cy="10"
                  r="7"
                  className="stroke-[#E7E0D4]"
                  strokeWidth="2.2"
                  fill="none"
                />
                <circle
                  cx="10"
                  cy="10"
                  r="7"
                  className={`transition-all duration-300 ease-out ${
                    dailyProgressPercent >= 100 ? 'stroke-[#2D5A27]' : 'stroke-[#6B2D2D]'
                  }`}
                  strokeWidth="2.2"
                  strokeDasharray={43.98}
                  strokeDashoffset={43.98 * (1 - dailyProgressPercent / 100)}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              {dailyProgressPercent >= 100 && (
                <span className="absolute text-[8px] font-bold text-[#2D5A27] leading-none">✓</span>
              )}
            </div>

            <span className="uppercase tracking-wider font-medium text-[11px] sm:text-xs hidden sm:inline">
              Target
            </span>
            <span
              id="header-target-percentage"
              className={`text-[10px] sm:text-[11px] font-mono tabular-nums ${
                dailyProgressPercent >= 100 ? 'text-[#2D5A27] font-semibold' : 'text-[#78716C]'
              }`}
            >
              {Math.round(dailyProgressPercent)}%
            </span>
          </button>
        </div>
      </header>

      {/* Main Manuscript Writing Surface */}
      <main
        style={keyboardInset > 0 ? { paddingBottom: `${keyboardInset + 140}px` } : undefined}
        className="flex-1 w-full max-w-[38rem] mx-auto px-6 pt-8 pb-36 md:pt-14 md:pb-32 flex flex-col justify-start"
      >
        <div
          ref={editorRef}
          id="manuscript-surface"
          contentEditable
          suppressContentEditableWarning
          onFocus={() => setIsEditing(true)}
          onBlur={handleEditorBlur}
          onPointerDown={() => setIsEditing(true)}
          onInput={triggerAutosave}
          onKeyDown={handleKeyDown}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onTouchEnd={updateActiveFormats}
          onClick={(e) => {
            setIsEditing(true);
            handleEditorClick(e);
          }}
          className="folio-editor flex-1 font-serif text-[20px] md:text-[21px] leading-[1.7] text-[#1C1917] focus:outline-none min-h-[60vh]"
          data-placeholder="Begin writing…"
        />
      </main>

      {/* Previous & Next Chapter Navigation */}
      {chapters && chapters.length > 1 && currentChapterIndex !== -1 && (
        <nav
          aria-label="Chapter sequence navigation"
          className={`w-full max-w-4xl mx-auto px-6 md:px-8 pt-8 pb-3 flex items-center justify-between border-t border-[#E7E0D4]/70 transition-opacity duration-200 select-none ${
            isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {currentChapterIndex > 0 ? (
            <button
              onClick={async () => {
                await executeSave();
                if (hasActiveAccessToken()) {
                  syncWithDrive().catch(() => {});
                }
                onSelectChapter?.(chapters[currentChapterIndex - 1].id);
              }}
              className="text-xs font-serif text-[#57534E] hover:text-[#1C1917] flex items-center gap-1.5 py-1 transition-colors group text-left cursor-pointer"
            >
              <span className="text-[#78716C] group-hover:text-[#1C1917]">←</span>
              <div>
                <span className="block text-[10px] font-sans uppercase tracking-widest text-[#78716C]">
                  Previous Chapter
                </span>
                <span className="truncate max-w-[140px] sm:max-w-[200px] block font-serif">
                  {chapters[currentChapterIndex - 1].title || `Chapter ${currentChapterIndex}`}
                </span>
              </div>
            </button>
          ) : (
            <div />
          )}

          <span className="text-[11px] font-sans uppercase tracking-wider text-[#78716C] hidden sm:inline-block">
            Chapter {currentChapterIndex + 1} of {chapters.length}
          </span>

          {currentChapterIndex < chapters.length - 1 ? (
            <button
              onClick={async () => {
                await executeSave();
                if (hasActiveAccessToken()) {
                  syncWithDrive().catch(() => {});
                }
                onSelectChapter?.(chapters[currentChapterIndex + 1].id);
              }}
              className="text-xs font-serif text-[#57534E] hover:text-[#1C1917] flex items-center gap-1.5 py-1 transition-colors group text-right ml-auto cursor-pointer"
            >
              <div>
                <span className="block text-[10px] font-sans uppercase tracking-widest text-[#78716C]">
                  Next Chapter
                </span>
                <span className="truncate max-w-[140px] sm:max-w-[200px] block font-serif">
                  {chapters[currentChapterIndex + 1].title || `Chapter ${currentChapterIndex + 2}`}
                </span>
              </div>
              <span className="text-[#78716C] group-hover:text-[#1C1917]">→</span>
            </button>
          ) : (
            <div />
          )}
        </nav>
      )}

      {/* Bottom Status, one line, small, muted:
          chapter words · novel words · today’s words
          Hides in focus mode */}
      <footer
        className={`w-full max-w-4xl mx-auto px-6 md:px-8 pt-4 pb-10 sm:pb-8 text-center text-xs text-[#57534E] tracking-wider transition-opacity duration-200 select-none ${
          isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <span>{chapterWordCount.toLocaleString()} chapter</span>
        <span className="mx-2 text-[#E7E0D4]">·</span>
        <span>{novelTotalWords.toLocaleString()} novel</span>
        <span className="mx-2 text-[#E7E0D4]">·</span>
        <span>{liveTodayWords.toLocaleString()} today</span>
      </footer>

      {/* Text Formatting Toolbar:
          - Rendered via Portal directly into document.body on its own independent layer
          - Only presented when actively editing text (caret/selection in editor)
          - Firmly anchored at bottom-right with explicit top:auto / left:auto
          - Decoupled from document scrolling, preventing jitter, snap-back, or accidental top pinning */}
      {hasMounted &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isEditing && (
              <motion.div
                ref={pillRef}
                id="persistent-format-pill"
                role="toolbar"
                aria-label="Text formatting toolbar"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: isFocusMode ? 0.25 : 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                style={{
                  position: 'fixed',
                  right: 'calc(1rem + env(safe-area-inset-right, 0px))',
                  bottom: `calc(1.25rem + env(safe-area-inset-bottom, 0px) + ${keyboardInset}px)`,
                  top: 'auto',
                  left: 'auto',
                  zIndex: 9999,
                }}
                className={`anchored-format-pill fixed right-4 bottom-5 sm:right-6 sm:bottom-6 md:right-8 md:bottom-8 z-[9999] flex items-center gap-1 bg-[#FBF7F0]/95 backdrop-blur-md border border-[#E7E0D4] rounded-full p-1 sm:p-1.5 shadow-lg paper-shadow select-none ${
                  isFocusMode ? 'hover:opacity-100' : ''
                }`}
              >
                <button
                  id="format-pill-bold"
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('bold')}
                  title="Bold (Ctrl/Cmd+B)"
                  aria-label="Bold text"
                  aria-pressed={activeFormats.bold}
                  className={`p-2 sm:p-2.5 rounded-full transition-colors flex items-center justify-center cursor-pointer min-w-[38px] min-h-[38px] sm:min-w-[40px] sm:min-h-[40px] ${
                    activeFormats.bold
                      ? 'bg-[#6B2D2D] text-[#FBF7F0] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#EAE3D6]/70 active:bg-[#EAE3D6]'
                  }`}
                >
                  <Bold className="w-4 h-4 flex-shrink-0" />
                </button>

                <button
                  id="format-pill-italic"
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('italic')}
                  title="Italic (Ctrl/Cmd+I)"
                  aria-label="Italicize text"
                  aria-pressed={activeFormats.italic}
                  className={`p-2 sm:p-2.5 rounded-full transition-colors flex items-center justify-center cursor-pointer min-w-[38px] min-h-[38px] sm:min-w-[40px] sm:min-h-[40px] ${
                    activeFormats.italic
                      ? 'bg-[#6B2D2D] text-[#FBF7F0] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#EAE3D6]/70 active:bg-[#EAE3D6]'
                  }`}
                >
                  <Italic className="w-4 h-4 flex-shrink-0" />
                </button>

                <button
                  id="format-pill-underline"
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat('underline')}
                  title="Underline (Ctrl/Cmd+U)"
                  aria-label="Underline text"
                  aria-pressed={activeFormats.underline}
                  className={`p-2 sm:p-2.5 rounded-full transition-colors flex items-center justify-center cursor-pointer min-w-[38px] min-h-[38px] sm:min-w-[40px] sm:min-h-[40px] ${
                    activeFormats.underline
                      ? 'bg-[#6B2D2D] text-[#FBF7F0] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#EAE3D6]/70 active:bg-[#EAE3D6]'
                  }`}
                >
                  <Underline className="w-4 h-4 flex-shrink-0" />
                </button>

                <div className="w-px h-4 bg-[#E7E0D4] mx-0.5 sm:mx-1" />

                <button
                  id="format-pill-scene-break"
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertSceneBreak()}
                  title="Insert Scene Break (Ctrl/Cmd+Enter)"
                  aria-label="Insert scene break ornament"
                  className="px-2.5 py-1.5 sm:px-3 rounded-full text-xs font-serif tracking-widest text-[#57534E] hover:text-[#1C1917] hover:bg-[#EAE3D6]/70 active:bg-[#EAE3D6] transition-colors flex items-center justify-center cursor-pointer min-h-[38px] sm:min-h-[40px]"
                >
                  · · ·
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      <MetricsDrawer
        isOpen={isMetricsOpen}
        onClose={() => setIsMetricsOpen(false)}
        folio={folio}
        chapterTitle={chapterTitle}
        chapterWordCount={chapterWordCount}
        novelTotalWords={novelTotalWords}
        todayWords={liveTodayWords}
        dailyTarget={cleanDailyTarget}
        onUpdateFolio={onUpdateFolio}
      />
    </div>
  );
};
