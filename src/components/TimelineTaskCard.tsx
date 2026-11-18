import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bell,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Pencil,
  Repeat,
  Timer,
  Trash2,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  REPEAT_LABELS,
  TaskItem,
} from '../types/planner';
import {
  formatDurationVi,
  getEndTime,
  isTaskCompletedOnDate,
  parseTimeMinutes,
  toDateKey,
} from '../utils/timeUtils';

interface TimelineTaskCardProps {
  task: TaskItem;
  selectedDate: string;
  now: Date;
  hasConflict?: boolean;
  onToggleComplete: (taskId: string, dateKey: string) => void;
  onToggleAction: (taskId: string, actionId: string) => void;
  onShiftTime: (taskId: string, deltaMinutes: number) => void;
  onStartPomodoro: (taskId: string) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (taskId: string) => void;
}

export const TimelineTaskCard: React.FC<TimelineTaskCardProps> = ({
  task,
  selectedDate,
  now,
  hasConflict,
  onToggleComplete,
  onToggleAction,
  onShiftTime,
  onStartPomodoro,
  onEdit,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(true);
  const completed = isTaskCompletedOnDate(task, selectedDate);
  const todayKey = toDateKey(now);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = parseTimeMinutes(task.startTime);
  const endMins = startMins + task.durationMinutes;

  const isToday = selectedDate === todayKey;
  const isOngoing = isToday && !completed && nowMins >= startMins && nowMins < endMins;
  const isOverdue = isToday && !completed && nowMins >= endMins;

  const doneActions = task.actions.filter((a) => a.done).length;
  const endTimeStr = getEndTime(task.startTime, task.durationMinutes);

  return (
    <article
      className={`rounded-2xl border transition-colors ${
        completed
          ? 'border-zinc-200/70 bg-zinc-50/80 opacity-75 dark:border-zinc-800/70 dark:bg-zinc-900/50'
          : isOngoing
          ? 'border-blue-300 bg-white shadow-sm shadow-blue-600/5 dark:border-blue-700/80 dark:bg-zinc-900'
          : 'border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900'
      }`}
    >
      <div className="p-4 sm:p-5">
        {/* Top Row: Time block + Completion Checkbox + Title */}
        <div className="flex items-start gap-3">
          {/* 44x44px minimum touch target checkbox */}
          <button
            type="button"
            onClick={() => onToggleComplete(task.id, selectedDate)}
            aria-label={completed ? `Bỏ đánh dấu xong ${task.title}` : `Đánh dấu xong ${task.title}`}
            className="min-h-[44px] min-w-[44px] -m-1.5 flex items-center justify-center shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <span
              className={`h-6 w-6 rounded-lg border flex items-center justify-center transition-colors ${
                completed
                  ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500'
                  : isOngoing
                  ? 'border-blue-600 bg-blue-50 text-transparent dark:border-blue-400 dark:bg-blue-950/40'
                  : 'border-zinc-300 bg-white text-transparent hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950'
              }`}
            >
              <Check className="h-3.5 w-3.5 stroke-[2.75]" />
            </span>
          </button>

          {/* Main Content */}
          <div className="min-w-0 flex-1">
            {/* Unboxed Metadata Row (Zero-Pill Rule) */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span
                className={`font-mono tabular-nums font-semibold ${
                  isOngoing
                    ? 'text-blue-600 dark:text-blue-400'
                    : isOverdue
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-zinc-900 dark:text-zinc-200'
                }`}
              >
                {task.startTime} – {endTimeStr}
              </span>
              <span aria-hidden="true">·</span>
              <span>{formatDurationVi(task.durationMinutes)}</span>
              <span aria-hidden="true">·</span>
              <span>{CATEGORY_LABELS[task.category]}</span>

              {task.priority !== 'normal' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`font-semibold ${
                      task.priority === 'urgent'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                </>
              )}

              {isOngoing && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    Đang diễn ra
                  </span>
                </>
              )}

              {isOverdue && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    Quá giờ dự kiến
                  </span>
                </>
              )}
            </div>

            {/* Title */}
            <h3
              className={`mt-1.5 text-base font-semibold leading-snug ${
                completed
                  ? 'line-through text-zinc-500 dark:text-zinc-500'
                  : 'text-zinc-900 dark:text-zinc-50'
              }`}
            >
              {task.title}
            </h3>

            {task.note && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {task.note}
              </p>
            )}

            {/* Secondary smart reminder & repeat line (unboxed) */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <Bell className="h-3.5 w-3.5 text-zinc-400" />
                {task.reminderBeforeMinutes > 0
                  ? `Nhắc trước ${task.reminderBeforeMinutes}p & đúng giờ`
                  : 'Nhắc đúng giờ'}
                {task.followUpAlert ? ' · Nhắc lại sau 3p' : ''}
              </span>

              {task.repeat !== 'none' && (
                <span className="inline-flex items-center gap-1">
                  <Repeat className="h-3.5 w-3.5 text-zinc-400" />
                  {REPEAT_LABELS[task.repeat]}
                </span>
              )}

              {(task.completedPomodoros ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                  <Timer className="h-3.5 w-3.5 text-zinc-400" />
                  {task.completedPomodoros} phiên
                </span>
              )}

              {task.snoozedUntil && task.snoozedUntil > Date.now() && (
                <span className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                  <Clock className="h-3.5 w-3.5" />
                  Báo lại lúc{' '}
                  {new Date(task.snoozedUntil).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>

            {hasConflict && !completed && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Khung giờ đang giao nhau với công việc khác
              </p>
            )}
          </div>
        </div>

        {/* Concrete Actions Checklist */}
        {task.actions.length > 0 && (
          <div className="mt-3 pl-9">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="min-h-[36px] inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Hành động cụ thể ({doneActions}/{task.actions.length})
            </button>

            {expanded && (
              <ul className="mt-1.5 divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {task.actions.map((act) => (
                  <li key={act.id}>
                    <button
                      type="button"
                      onClick={() => onToggleAction(task.id, act.id)}
                      className="min-h-[44px] w-full flex items-center gap-2.5 py-1.5 text-left group focus-visible:outline-2 focus-visible:outline-blue-600 rounded-lg"
                    >
                      <span
                        className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                          act.done
                            ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500'
                            : 'border-zinc-300 bg-white group-hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950'
                        }`}
                      >
                        {act.done && <Check className="h-3 w-3 stroke-[2.5]" />}
                      </span>
                      <span
                        className={`text-sm leading-snug ${
                          act.done
                            ? 'line-through text-zinc-400 dark:text-zinc-500'
                            : 'text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        {act.text}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Quick Time Shift & Edit Controls (Thumb-accessible 44px buttons) */}
        <div className="mt-3 pt-2.5 pl-9 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onShiftTime(task.id, -15)}
              title="Đẩy sớm hơn 15 phút"
              className="min-h-[40px] min-w-[40px] inline-flex items-center gap-1 rounded-xl px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 whitespace-nowrap"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              -15p
            </button>
            <button
              type="button"
              onClick={() => onShiftTime(task.id, 15)}
              title="Lùi muộn hơn 15 phút"
              className="min-h-[40px] min-w-[40px] inline-flex items-center gap-1 rounded-xl px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 whitespace-nowrap"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              +15p
            </button>
          </div>

          <div className="flex items-center gap-1">
            {!completed && (
              <button
                type="button"
                onClick={() => onStartPomodoro(task.id)}
                aria-label={`Bắt đầu Pomodoro cho ${task.title}`}
                className="min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 whitespace-nowrap"
              >
                <Timer className="h-3.5 w-3.5" />
                Pomodoro
              </button>
            )}
            <button
              type="button"
              onClick={() => onEdit(task)}
              aria-label={`Sửa ${task.title}`}
              className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 whitespace-nowrap"
            >
              <Pencil className="h-3.5 w-3.5" />
              Sửa
            </button>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              aria-label={`Xóa ${task.title}`}
              className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl px-2.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
