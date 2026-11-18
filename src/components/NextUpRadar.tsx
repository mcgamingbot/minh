import React from 'react';
import { Bell, BellRing, CheckCircle2, Clock, Pause, Play, Timer, Volume2, VolumeX } from 'lucide-react';
import { AppSettings, CATEGORY_LABELS, POMODORO_MODE_LABELS, PomodoroMode, TaskItem } from '../types/planner';
import {
  formatCountdown,
  getEndTime,
  isTaskCompletedOnDate,
  parseTimeMinutes,
  taskOccursOnDate,
  toDateKey,
} from '../utils/timeUtils';

interface NextUpRadarProps {
  now: Date;
  tasks: TaskItem[];
  settings: AppSettings;
  notificationPermission: NotificationPermission | 'unsupported';
  audioUnlocked: boolean;
  onRequestNotification: () => void;
  onUnlockAudio: () => void;
  onToggleSound: () => void;
  onTestReminder: (task?: TaskItem) => void;
  onToggleTaskDone: (taskId: string, dateKey: string) => void;
  onSelectTask: (task: TaskItem) => void;
  pomodoroPreview?: {
    isRunning: boolean;
    mode: PomodoroMode;
    remainingSeconds: number;
    totalModeSeconds: number;
    linkedTaskTitle?: string;
    onToggleRun: () => void;
    onOpenPomodoro: () => void;
  };
}

export const NextUpRadar: React.FC<NextUpRadarProps> = ({
  now,
  tasks,
  settings,
  notificationPermission,
  audioUnlocked,
  onRequestNotification,
  onUnlockAudio,
  onToggleSound,
  onTestReminder,
  onToggleTaskDone,
  onSelectTask,
  pomodoroPreview,
}) => {
  const todayKey = toDateKey(now);
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const todayTasks = tasks
    .filter((t) => taskOccursOnDate(t, todayKey))
    .sort((a, b) => parseTimeMinutes(a.startTime) - parseTimeMinutes(b.startTime));

  const completedCount = todayTasks.filter((t) => isTaskCompletedOnDate(t, todayKey)).length;
  const totalCount = todayTasks.length;
  const completionRatio = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const activeTask = todayTasks.find((t) => {
    if (isTaskCompletedOnDate(t, todayKey)) return false;
    const start = parseTimeMinutes(t.startTime);
    const end = start + t.durationMinutes;
    return nowMinutes >= start && nowMinutes < end;
  });

  const nextTask = todayTasks.find((t) => {
    if (isTaskCompletedOnDate(t, todayKey)) return false;
    return parseTimeMinutes(t.startTime) * 60 > nowSeconds;
  });

  const focusTask = activeTask ?? nextTask;

  let countdownLabel = '';
  let progressPct = 0;
  if (activeTask) {
    const startSecs = parseTimeMinutes(activeTask.startTime) * 60;
    const endSecs = startSecs + activeTask.durationMinutes * 60;
    const remainingSecs = Math.max(0, endSecs - nowSeconds);
    countdownLabel = `Còn ${formatCountdown(remainingSecs)}`;
    progressPct = Math.min(
      100,
      Math.max(0, Math.round(((nowSeconds - startSecs) / (activeTask.durationMinutes * 60)) * 100))
    );
  } else if (nextTask) {
    const startSecs = parseTimeMinutes(nextTask.startTime) * 60;
    const diffSecs = Math.max(0, startSecs - nowSeconds);
    countdownLabel = `Còn ${formatCountdown(diffSecs)}`;
  }

  // SVG progress ring geometry
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionRatio / 100) * circumference;

  return (
    <section
      aria-label="Theo dõi nhịp thời gian và nhắc nhở thông minh"
      className="rounded-3xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {/* Top summary row */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Đồng hồ thực ·{' '}
            <span className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
              {now.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {activeTask
              ? 'Đang trong khung giờ'
              : nextTask
              ? 'Nhắc nhở tiếp theo'
              : 'Lịch hôm nay đã gọn'}
          </h2>
        </div>

        {/* Completion Ring */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative h-14 w-14 flex items-center justify-center">
            <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
              <circle
                cx="28"
                cy="28"
                r={radius}
                fill="none"
                strokeWidth="4.5"
                className="stroke-zinc-100 dark:stroke-zinc-800"
              />
              <circle
                cx="28"
                cy="28"
                r={radius}
                fill="none"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="stroke-blue-600 transition-all duration-300 dark:stroke-blue-500"
              />
            </svg>
            <span className="absolute font-mono tabular-nums text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              {completedCount}/{totalCount}
            </span>
          </div>
        </div>
      </div>

      {/* Active or Next Task Spotlight */}
      {focusTask ? (
        <div className="mt-4 rounded-2xl bg-[#F7F7F5] p-4 dark:bg-zinc-950/70">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => onSelectTask(focusTask)}
              className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-blue-600 rounded-lg"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-mono tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                  {focusTask.startTime} – {getEndTime(focusTask.startTime, focusTask.durationMinutes)}
                </span>
                <span aria-hidden="true">·</span>
                <span>{CATEGORY_LABELS[focusTask.category]}</span>
                {focusTask.reminderBeforeMinutes > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Nhắc trước {focusTask.reminderBeforeMinutes}p</span>
                  </>
                )}
              </div>
              <p className="mt-1.5 text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                {focusTask.title}
              </p>
            </button>

            <span className="shrink-0 font-mono tabular-nums text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {countdownLabel}
            </span>
          </div>

          {activeTask && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500 dark:bg-blue-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {focusTask.actions.length > 0 && (
            <p className="mt-2.5 text-xs text-zinc-600 dark:text-zinc-400">
              Hành động cụ thể:{' '}
              <span className="font-medium text-zinc-900 dark:text-zinc-200">
                {focusTask.actions.filter((a) => a.done).length}/{focusTask.actions.length} bước đã xong
              </span>
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleTaskDone(focusTask.id, todayKey)}
              className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 active:scale-[0.98] transition-transform whitespace-nowrap dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              <CheckCircle2 className="h-4 w-4" />
              Đánh dấu hoàn thành
            </button>
            <button
              type="button"
              onClick={() => onTestReminder(focusTask)}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 active:scale-[0.98] transition-transform whitespace-nowrap dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <BellRing className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Thử nhắc
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-[#F7F7F5] p-4 text-sm text-zinc-600 dark:bg-zinc-950/70 dark:text-zinc-400">
          Không còn công việc nào chờ thực hiện trong hôm nay. Bạn có thể thêm việc mới hoặc kiểm tra lịch ngày mai.
        </div>
      )}

      {/* Live Pomodoro Quick Strip (when running or partially elapsed) */}
      {pomodoroPreview &&
        (pomodoroPreview.isRunning ||
          pomodoroPreview.remainingSeconds < pomodoroPreview.totalModeSeconds) && (
          <div className="mt-4 rounded-2xl border border-blue-200/80 bg-blue-50/70 p-3.5 flex items-center justify-between gap-3 dark:border-blue-800/60 dark:bg-blue-950/30">
            <button
              type="button"
              onClick={pomodoroPreview.onOpenPomodoro}
              className="min-w-0 flex-1 flex items-center gap-2.5 text-left"
            >
              <Timer className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 truncate">
                  Pomodoro · {POMODORO_MODE_LABELS[pomodoroPreview.mode]}
                  {pomodoroPreview.linkedTaskTitle
                    ? ` · ${pomodoroPreview.linkedTaskTitle}`
                    : ''}
                </p>
                <p className="font-mono tabular-nums text-sm font-bold text-blue-700 dark:text-blue-300">
                  {String(Math.floor(pomodoroPreview.remainingSeconds / 60)).padStart(2, '0')}:
                  {String(pomodoroPreview.remainingSeconds % 60).padStart(2, '0')}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={pomodoroPreview.onToggleRun}
              aria-label={pomodoroPreview.isRunning ? 'Tạm dừng Pomodoro' : 'Tiếp tục Pomodoro'}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 shrink-0"
            >
              {pomodoroPreview.isRunning ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>
          </div>
        )}

      {/* Smart Reminder Readiness Bar */}
      <div className="mt-4 pt-3.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onUnlockAudio();
              onToggleSound();
            }}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 whitespace-nowrap"
          >
            {settings.soundEnabled ? (
              <Volume2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-zinc-400" />
            )}
            {settings.soundEnabled
              ? audioUnlocked
                ? 'Âm báo sẵn sàng'
                : 'Chạm để bật âm trên ĐT'
              : 'Đang tắt âm báo'}
          </button>
        </div>

        {notificationPermission === 'default' && (
          <button
            type="button"
            onClick={onRequestNotification}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-950 whitespace-nowrap"
          >
            <Bell className="h-4 w-4" />
            Bật thông báo nền
          </button>
        )}
        {notificationPermission === 'granted' && (
          <span className="inline-flex items-center gap-1.5 px-2 text-xs text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
            <Clock className="h-3.5 w-3.5" />
            Thông báo nền đã bật
          </span>
        )}
      </div>
    </section>
  );
};
