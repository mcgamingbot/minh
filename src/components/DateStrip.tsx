import React from 'react';
import { getDateStripDays, toDateKey } from '../utils/timeUtils';

interface DateStripProps {
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  taskCountsByDate: Record<string, number>;
}

export const DateStrip: React.FC<DateStripProps> = ({
  selectedDate,
  onSelectDate,
  taskCountsByDate,
}) => {
  const days = getDateStripDays(selectedDate, 14);
  const todayKey = toDateKey(new Date());

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {days.map((day) => {
          const count = taskCountsByDate[day.dateKey] ?? 0;
          return (
            <button
              key={day.dateKey}
              type="button"
              onClick={() => onSelectDate(day.dateKey)}
              className={`min-h-[56px] min-w-[50px] shrink-0 flex flex-col items-center justify-center rounded-2xl px-2.5 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                day.isSelected
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950'
                  : day.isToday
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/70'
                  : 'bg-white text-zinc-700 border border-zinc-200/80 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800'
              }`}
              aria-label={`Chọn ngày ${day.dayNum}`}
              aria-pressed={day.isSelected}
            >
              <span
                className={`text-[11px] font-medium leading-none ${
                  day.isSelected
                    ? 'text-zinc-300 dark:text-zinc-600'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {day.dayShort}
              </span>
              <span className="mt-1 font-mono tabular-nums text-sm font-semibold leading-none">
                {day.dayNum}
              </span>
              <span
                className={`mt-1 text-[10px] font-mono tabular-nums leading-none ${
                  count > 0
                    ? day.isSelected
                      ? 'text-blue-300 dark:text-blue-600'
                      : 'text-blue-600 dark:text-blue-400'
                    : 'opacity-0'
                }`}
              >
                {count > 0 ? count : 0}
              </span>
            </button>
          );
        })}
      </div>

      {selectedDate !== todayKey && (
        <button
          type="button"
          onClick={() => onSelectDate(todayKey)}
          className="min-h-[44px] shrink-0 whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Hôm nay
        </button>
      )}
    </div>
  );
};
