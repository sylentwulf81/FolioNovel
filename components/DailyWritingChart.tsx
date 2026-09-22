'use client';

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { ChevronDown, ChevronUp, TrendingUp, Target, PenLine } from 'lucide-react';
import { DailyStat } from '@/lib/types';

interface DailyWritingChartProps {
  stats: DailyStat[];
  dailyTarget: number;
  todayWords: number;
}

interface ChartDataPoint {
  date: string;
  dayLabel: string;
  fullDateLabel: string;
  words: number;
  isToday: boolean;
  metTarget: boolean;
}

const emptySubscribe = () => () => {};

export const DailyWritingChart: React.FC<DailyWritingChartProps> = ({
  stats,
  dailyTarget,
  todayWords,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Format the 7 days data for recharts
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!stats || stats.length === 0) return [];

    const todayStr = new Date().toISOString().slice(0, 10);

    return stats.map((item, index) => {
      // Parse date components safely (YYYY-MM-DD)
      const parts = item.date.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, day);

      const isToday = index === stats.length - 1 || item.date === todayStr;

      // Sync latest today's count
      const words = isToday ? Math.max(item.wordsWritten, todayWords) : item.wordsWritten;

      // Short day name (e.g. "Mon", "Tue")
      const dayName = isToday
        ? 'Today'
        : dateObj.toLocaleDateString(undefined, { weekday: 'short' });

      // Clean formatted date string for tooltip
      const fullDateLabel = dateObj.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

      return {
        date: item.date,
        dayLabel: dayName,
        fullDateLabel: isToday ? `${fullDateLabel} (Today)` : fullDateLabel,
        words,
        isToday,
        metTarget: words >= dailyTarget && dailyTarget > 0,
      };
    });
  }, [stats, todayWords, dailyTarget]);

  // Aggregate metrics
  const totalWords = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.words, 0);
  }, [chartData]);

  const dailyAverage = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.round(totalWords / chartData.length);
  }, [totalWords, chartData.length]);

  const daysTargetMet = useMemo(() => {
    return chartData.filter((d) => d.metTarget).length;
  }, [chartData]);

  const maxWords = useMemo(() => {
    const highestInWeek = Math.max(...chartData.map((d) => d.words), 0);
    return Math.max(highestInWeek, dailyTarget, 200);
  }, [chartData, dailyTarget]);

  // Custom Tooltip component
  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: ChartDataPoint = payload[0].payload;
      const percentOfTarget = dailyTarget > 0 ? Math.round((data.words / dailyTarget) * 100) : 0;

      return (
        <div
          id={`chart-tooltip-${data.date}`}
          className="bg-[#FBF7F0] border border-[#E7E0D4] px-3.5 py-2.5 rounded-lg shadow-sm font-sans min-w-[140px]"
        >
          <p className="text-[11px] font-medium text-[#78716C] mb-1">{data.fullDateLabel}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-lg text-[#1C1917] font-medium">
              {data.words.toLocaleString()}
            </span>
            <span className="text-xs text-[#57534E]">words</span>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-[#E7E0D4]/70 flex items-center justify-between text-[11px]">
            <span className="text-[#78716C]">Daily target:</span>
            <span
              className={
                data.metTarget
                  ? 'font-medium text-[#6B2D2D]'
                  : 'font-medium text-[#57534E]'
              }
            >
              {percentOfTarget}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <section
      id="daily-writing-history-section"
      className={`mb-6 sm:mb-8 md:mb-10 bg-[#FBF7F0] border border-[#E7E0D4] rounded-xl paper-shadow transition-all duration-200 ${
        isExpanded ? 'p-4 sm:p-6 md:p-7' : 'p-3 sm:p-4 hover:border-[#D5CDBC]'
      }`}
      aria-label="Daily writing history"
    >
      {/* Header & Metrics (Clickable toggle) */}
      <div
        id="writing-history-toggle-header"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`cursor-pointer select-none ${
          isExpanded ? 'pb-3.5 mb-4 border-b border-[#E7E0D4]/70' : ''
        }`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
        aria-controls="writing-history-chart-content"
      >
        {/* Top Header Row: Icon, Title & Toggle Button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#EAE3D6]/70 flex items-center justify-center text-[#57534E] flex-shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="writing-history-title"
                  className="font-serif text-base sm:text-lg font-normal text-[#1C1917] tracking-tight truncate"
                >
                  Writing Rhythm
                </h2>
                {!isExpanded && (
                  <span className="text-[11px] font-sans text-[#78716C] bg-[#EAE3D6]/50 px-2 py-0.5 rounded-full hidden xs:inline">
                    Past 7 days
                  </span>
                )}
              </div>
              {isExpanded ? (
                <p className="text-xs text-[#78716C] mt-0.5 hidden xs:block truncate">
                  Word count activity across the past 7 days
                </p>
              ) : (
                <div className="flex items-center gap-2 text-xs text-[#57534E] mt-0.5">
                  <span className="inline-flex items-center gap-1" title="7-day total words">
                    <PenLine className="w-3 h-3 text-[#78716C]" />
                    <span className="font-serif font-medium text-[#1C1917]">{totalWords.toLocaleString()}</span>
                    <span className="text-[10px] text-[#78716C] hidden xs:inline">total</span>
                  </span>
                  <span className="text-[#E7E0D4]">·</span>
                  <span className="inline-flex items-center gap-1" title="Daily average">
                    <TrendingUp className="w-3 h-3 text-[#78716C]" />
                    <span className="font-serif font-medium text-[#1C1917]">{dailyAverage.toLocaleString()}</span>
                    <span className="text-[10px] text-[#78716C] hidden xs:inline">avg</span>
                  </span>
                  {daysTargetMet > 0 && (
                    <>
                      <span className="text-[#E7E0D4]">·</span>
                      <span className="inline-flex items-center gap-1 text-[#6B2D2D]" title="Target met">
                        <Target className="w-3 h-3" />
                        <span className="font-medium">{daysTargetMet}/{chartData.length}</span>
                        <span className="text-[10px] hidden xs:inline">days</span>
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Toggle button: Icon-only on mobile, text + icon on desktop */}
          <button
            type="button"
            id="writing-history-toggle-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center gap-1 text-xs uppercase tracking-wider text-[#57534E] hover:text-[#1C1917] bg-[#EAE3D6]/60 hover:bg-[#EAE3D6] p-1.5 sm:px-2.5 sm:py-1 rounded transition-colors flex-shrink-0 cursor-pointer"
            title={isExpanded ? 'Collapse chart' : 'Expand chart'}
            aria-label={isExpanded ? 'Collapse chart' : 'Expand chart'}
          >
            <span className="hidden sm:inline">{isExpanded ? 'Hide' : 'View chart'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Metrics Bar when Expanded (Iconography-led, never cramped on responsive) */}
        {isExpanded && (
          <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 sm:gap-5 text-xs font-sans mt-3.5 pt-3 border-t border-[#E7E0D4]/70">
            {/* Total words */}
            <div className="flex items-center gap-1.5 min-w-0" title="7-day total words">
              <PenLine className="w-3.5 h-3.5 text-[#78716C] flex-shrink-0" />
              <span className="text-[#78716C] hidden sm:inline">7-day total:</span>
              <span className="font-serif text-sm font-medium text-[#1C1917] truncate">
                {totalWords.toLocaleString()}
              </span>
            </div>

            <div className="hidden sm:block h-3 w-px bg-[#E7E0D4]" />

            {/* Daily average */}
            <div className="flex items-center gap-1.5 min-w-0" title="Daily average words">
              <TrendingUp className="w-3.5 h-3.5 text-[#78716C] flex-shrink-0" />
              <span className="text-[#78716C] hidden sm:inline">Daily avg:</span>
              <span className="font-serif text-sm font-medium text-[#1C1917] truncate">
                {dailyAverage.toLocaleString()}
              </span>
            </div>

            <div className="hidden sm:block h-3 w-px bg-[#E7E0D4]" />

            {/* Target met */}
            <div className="flex items-center gap-1.5 min-w-0" title="Days daily target met">
              <Target className="w-3.5 h-3.5 text-[#6B2D2D] flex-shrink-0" />
              <span className="text-[#78716C] hidden sm:inline">Target met:</span>
              <span className="font-medium text-[#6B2D2D] text-xs sm:text-sm truncate">
                {daysTargetMet} / {chartData.length}
                <span className="hidden sm:inline"> days</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Chart Canvas & Legend when expanded */}
      {isExpanded && (
        <div id="writing-history-chart-content" className="space-y-3 pt-1">
          {/* Chart Canvas */}
          <div className="w-full h-40 sm:h-48" id="writing-history-chart-wrapper">
            {!isMounted ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-[#78716C]">
                Loading writing history...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 12, right: 6, left: -22, bottom: 0 }}
                  barCategoryGap="18%"
                >
                  <XAxis
                    dataKey="dayLabel"
                    stroke="#A8A29E"
                    tickLine={false}
                    axisLine={{ stroke: '#E7E0D4' }}
                    tick={{ fill: '#57534E', fontSize: 11, fontFamily: 'var(--font-sans)' }}
                    dy={6}
                  />
                  <YAxis
                    stroke="#A8A29E"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#78716C', fontSize: 10, fontFamily: 'var(--font-sans)' }}
                    domain={[0, Math.ceil(maxWords * 1.15)]}
                    allowDecimals={false}
                    width={28}
                    tickFormatter={(val: number) => (val >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : `${val}`)}
                  />
                  <Tooltip
                    content={renderCustomTooltip}
                    cursor={{ fill: 'rgba(231, 224, 212, 0.45)', radius: 4 }}
                  />
                  {dailyTarget > 0 && (
                    <ReferenceLine
                      y={dailyTarget}
                      stroke="#6B2D2D"
                      strokeDasharray="4 3"
                      strokeWidth={1.2}
                      strokeOpacity={0.65}
                      label={{
                        value: `Target: ${dailyTarget}`,
                        position: 'insideTopLeft',
                        fill: '#6B2D2D',
                        fontSize: 10,
                        fontWeight: 500,
                        dy: -8,
                      }}
                    />
                  )}
                  <Bar dataKey="words" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {chartData.map((entry) => {
                      let fillColor = '#A89F91'; // default muted warm taupe

                      if (entry.metTarget) {
                        fillColor = '#6B2D2D'; // reached target: signature literary crimson
                      } else if (entry.isToday) {
                        fillColor = '#944B4B'; // today in-progress
                      }

                      return (
                        <Cell
                          key={`cell-${entry.date}`}
                          fill={fillColor}
                          className="transition-colors duration-200"
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Subtle Legend / Note: Clean single line without awkward wrapping */}
          <div className="mt-2 pt-2.5 border-t border-[#E7E0D4]/50 flex items-center justify-between text-[11px] text-[#78716C]">
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#6B2D2D]" />
                Target met
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#A89F91]" />
                Under target
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#944B4B]" />
                Today
              </span>
            </div>
            <span className="hidden sm:inline">Hover bar for daily breakdown</span>
          </div>
        </div>
      )}
    </section>
  );
};
