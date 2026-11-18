import React from 'react';
import { BellRing, CalendarClock, Check, CheckCircle2, Clock, Play, Timer, X } from 'lucide-react';
import { ActiveReminder, TaskItem } from '../types/planner';
import { findNextFreeSlot, getEndTime } from '../utils/timeUtils';

interface ActiveReminderModalProps {
  reminder: ActiveReminder | null;
  task: TaskItem | null;
  allTasks: TaskItem[];
  pendingQueueCount: number;
  onStartNow: (taskId: string, dateKey: string) => void;
  onStartPomodoro: (taskId: string) => void;
  onSnooze: (taskId: string, minutes: number) => void;
  onSmartReschedule: (taskId: string, newStartTime: string) => void;
  onCompleteTask: (taskId: string, dateKey: string) => void;
  onToggleAction: (taskId: string, actionId: string) => void;
  onDismiss: () => void;
}

export const ActiveReminderModal: React.FC<ActiveReminderModalProps> = ({
  reminder,
  task,
  allTasks,
  pendingQueueCount,
  onStartNow,
  onStartPomodoro,
  onSnooze,
  onSmartReschedule,
  onCompleteTask,
  onToggleAction,
  onDismiss,
}) => {
  if (!reminder) return null;

  const displayTitle = task?.title ?? 'Họp chốt kế hoạch & kiểm tra hành động ưu tiên';
  const displayStart = task?.startTime ?? 'Hiện tại';
  const displayEnd = task
    ? getEndTime(task.startTime, task.durationMinutes)
    : '';
  const actions = task?.actions ?? [];
  const nextFreeSlot = task
    ? findNextFreeSlot(
        allTasks,
        reminder.dateKey,
        task.durationMinutes,
        undefined,
        task.id
      )
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="active-reminder-headline"
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 pb-safe shadow-2xl">
        {/* Top Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <p
                id="active-reminder-headline"
                className="text-sm font-bold text-blue-600 dark:text-blue-400"
              >
                {reminder.headline}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {reminder.detail}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Đóng nhắc nhở"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Task Details */}
        <div className="mt-4 rounded-2xl bg-[#F7F7F5] p-4 dark:bg-zinc-950">
          {displayEnd && (
            <p className="font-mono tabular-nums text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {displayStart} – {displayEnd}
            </p>
          )}
          <h3 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
            {displayTitle}
          </h3>

          {actions.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-zinc-200/70 pt-2.5 dark:border-zinc-800">
              {actions.map((act) => (
                <li key={act.id}>
                  <button
                    type="button"
                    onClick={() => task && onToggleAction(task.id, act.id)}
                    className="min-h-[40px] w-full flex items-center gap-2.5 text-left"
                  >
                    <span
                      className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center ${
                        act.done
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900'
                      }`}
                    >
                      {act.done && <Check className="h-3 w-3 stroke-[2.5]" />}
                    </span>
                    <span
                      className={`text-sm ${
                        act.done
                          ? 'line-through text-zinc-400'
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

        {/* Thumb-zone Action Stack */}
        <div className="mt-4 space-y-2.5">
          {task ? (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onStartNow(task.id, reminder.dateKey)}
                  className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-transform"
                >
                  <Play className="h-4 w-4" />
                  Bắt đầu ngay
                </button>
                <button
                  type="button"
                  onClick={() => onStartPomodoro(task.id)}
                  className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 active:scale-[0.98] transition-transform dark:bg-zinc-100 dark:text-zinc-950"
                >
                  <Timer className="h-4 w-4" />
                  Vào Pomodoro
                </button>
              </div>

              <button
                type="button"
                onClick={() => onCompleteTask(task.id, reminder.dateKey)}
                className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 active:scale-[0.98] transition-transform"
              >
                <CheckCircle2 className="h-4 w-4" />
                Đánh dấu xong việc
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onSnooze(task.id, 5)}
                  className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  <Clock className="h-4 w-4 text-zinc-500" />
                  Báo lại +5 phút
                </button>
                <button
                  type="button"
                  onClick={() => onSnooze(task.id, 15)}
                  className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  <Clock className="h-4 w-4 text-zinc-500" />
                  Báo lại +15 phút
                </button>
              </div>

              {nextFreeSlot && (
                <button
                  type="button"
                  onClick={() => onSmartReschedule(task.id, nextFreeSlot)}
                  className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 text-xs font-semibold text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                >
                  <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Dời sang giờ trống gần nhất ({nextFreeSlot})
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onDismiss}
              className="min-h-[48px] w-full rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Đã hiểu · Đóng nhắc thử
            </button>
          )}

          {pendingQueueCount > 0 && (
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              Còn {pendingQueueCount} nhắc nhở khác đang chờ
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
