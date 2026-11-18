import React from 'react';
import {
  Check,
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Timer,
  X,
} from 'lucide-react';
import {
  POMODORO_MODE_LABELS,
  POMODORO_PRESETS,
  PomodoroMode,
  PomodoroPreset,
  PomodoroStats,
  TaskItem,
} from '../types/planner';
import { isTaskCompletedOnDate, parseTimeMinutes, taskOccursOnDate, toDateKey } from '../utils/timeUtils';

interface PomodoroViewProps {
  mode: PomodoroMode;
  presetId: string;
  activePreset: PomodoroPreset;
  isRunning: boolean;
  remainingSeconds: number;
  totalModeSeconds: number;
  cycleCount: number;
  linkedTaskId: string | null;
  autoContinue: boolean;
  stats: PomodoroStats;
  lastFinishedNotice: string | null;
  tasks: TaskItem[];
  onStartOrResume: () => void;
  onPause: () => void;
  onReset: () => void;
  onSwitchMode: (mode: PomodoroMode) => void;
  onSelectPreset: (presetId: string) => void;
  onSkipPhase: () => void;
  onSelectTask: (taskId: string | null) => void;
  onToggleAutoContinue: (val: boolean) => void;
  onDismissNotice: () => void;
  onToggleAction: (taskId: string, actionId: string) => void;
  onCompleteTask: (taskId: string, dateKey: string) => void;
}

export const PomodoroView: React.FC<PomodoroViewProps> = ({
  mode,
  presetId,
  activePreset,
  isRunning,
  remainingSeconds,
  totalModeSeconds,
  cycleCount,
  linkedTaskId,
  autoContinue,
  stats,
  lastFinishedNotice,
  tasks,
  onStartOrResume,
  onPause,
  onReset,
  onSwitchMode,
  onSelectPreset,
  onSkipPhase,
  onSelectTask,
  onToggleAutoContinue,
  onDismissNotice,
  onToggleAction,
  onCompleteTask,
}) => {
  const todayKey = toDateKey(new Date());
  const todayPendingTasks = tasks
    .filter((t) => taskOccursOnDate(t, todayKey) && !isTaskCompletedOnDate(t, todayKey))
    .sort((a, b) => parseTimeMinutes(a.startTime) - parseTimeMinutes(b.startTime));

  const linkedTask = tasks.find((t) => t.id === linkedTaskId) ?? null;

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timeText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const progress =
    totalModeSeconds > 0
      ? Math.min(1, Math.max(0, (totalModeSeconds - remainingSeconds) / totalModeSeconds))
      : 0;
  const radius = 104;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const ringStrokeClass =
    mode === 'focus'
      ? 'stroke-blue-600 dark:stroke-blue-500'
      : mode === 'shortBreak'
      ? 'stroke-emerald-600 dark:stroke-emerald-500'
      : 'stroke-amber-600 dark:stroke-amber-500';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Main Timer Card */}
      <section className="lg:col-span-7 rounded-3xl border border-zinc-200/80 bg-white p-5 sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
        {/* Mode Switcher */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-1 rounded-2xl bg-[#F7F7F5] p-1 dark:bg-zinc-950">
            {(['focus', 'shortBreak', 'longBreak'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onSwitchMode(m)}
                className={`min-h-[42px] rounded-xl px-3.5 sm:px-4 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  mode === m
                    ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                {POMODORO_MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Phase Completion Notice */}
        {lastFinishedNotice && (
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/90 px-4 py-3 flex items-center justify-between gap-3 dark:border-blue-800/70 dark:bg-blue-950/40">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-200">
              {lastFinishedNotice}
            </p>
            <button
              type="button"
              onClick={onDismissNotice}
              aria-label="Đóng thông báo"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-blue-700 hover:bg-blue-100 dark:text-blue-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Circular SVG Countdown */}
        <div className="mt-6 flex flex-col items-center">
          <div className="relative h-60 w-60 sm:h-64 sm:w-64 flex items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 240 240">
              <circle
                cx="120"
                cy="120"
                r={radius}
                fill="none"
                strokeWidth="10"
                className="stroke-zinc-100 dark:stroke-zinc-800"
              />
              <circle
                cx="120"
                cy="120"
                r={radius}
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={`${ringStrokeClass} transition-all duration-300`}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {POMODORO_MODE_LABELS[mode]} · {activePreset.label}
              </span>
              <span className="mt-1 font-mono tabular-nums text-5xl sm:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {timeText}
              </span>
              <span className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Chu kỳ {cycleCount + 1} / 4 trước nghỉ dài
              </span>
            </div>
          </div>

          {/* 4-step Cycle Indicator */}
          <div className="mt-3 flex items-center gap-2" aria-label={`Chu kỳ ${cycleCount} trên 4`}>
            {[0, 1, 2, 3].map((idx) => (
              <span
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx < cycleCount
                    ? 'w-6 bg-blue-600 dark:bg-blue-500'
                    : idx === cycleCount && mode === 'focus'
                    ? 'w-6 bg-blue-200 dark:bg-blue-900'
                    : 'w-2 bg-zinc-200 dark:bg-zinc-800'
                }`}
              />
            ))}
          </div>

          {/* Primary Thumb Controls */}
          <div className="mt-6 flex items-center justify-center gap-3 w-full max-w-sm">
            <button
              type="button"
              onClick={onReset}
              aria-label="Đặt lại đồng hồ"
              className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <RotateCcw className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={isRunning ? onPause : onStartOrResume}
              className={`min-h-[52px] flex-1 inline-flex items-center justify-center gap-2.5 rounded-2xl px-6 text-sm font-bold text-white active:scale-[0.98] transition-transform ${
                mode === 'focus'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : mode === 'shortBreak'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="h-5 w-5" />
                  Tạm dừng
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  {remainingSeconds < totalModeSeconds ? 'Tiếp tục' : 'Bắt đầu phiên'}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onSkipPhase}
              aria-label="Chuyển sang chặng tiếp theo"
              title="Chuyển sang chặng tiếp theo"
              className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Presets & Auto-continue */}
        <div className="mt-7 pt-5 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Nhịp thời gian (Tập trung / Nghỉ)
            </span>
            <div className="flex items-center gap-1.5">
              {POMODORO_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPreset(p.id)}
                  className={`min-h-[38px] rounded-xl px-3 font-mono tabular-nums text-xs font-semibold transition-colors ${
                    presetId === p.id
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950'
                      : 'border border-zinc-200 bg-[#F7F7F5] text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <label className="min-h-[44px] flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              Tự động đếm tiếp sang giờ nghỉ / phiên tiếp theo khi hết giờ
            </span>
            <input
              type="checkbox"
              checked={autoContinue}
              onChange={(e) => onToggleAutoContinue(e.target.checked)}
              className="h-5 w-5 rounded accent-blue-600 shrink-0"
            />
          </label>
        </div>
      </section>

      {/* Right Column: Linked Task + Concrete Actions + Today's Stats */}
      <div className="lg:col-span-5 space-y-5">
        {/* Today's Pomodoro Summary */}
        <section className="rounded-3xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Thành quả tập trung hôm nay
            </h2>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#F7F7F5] p-3.5 dark:bg-zinc-950">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Phiên hoàn thành</p>
              <p className="mt-1 font-mono tabular-nums text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {stats.completedSessions}
              </p>
            </div>
            <div className="rounded-2xl bg-[#F7F7F5] p-3.5 dark:bg-zinc-950">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Tổng phút tập trung</p>
              <p className="mt-1 font-mono tabular-nums text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {stats.focusedMinutes}p
              </p>
            </div>
          </div>
        </section>

        {/* Task Attachment & Concrete Actions */}
        <section className="rounded-3xl border border-zinc-200/80 bg-white p-5 space-y-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <label
              htmlFor="pomodoro-task-select"
              className="block text-sm font-bold text-zinc-900 dark:text-zinc-100"
            >
              Gắn với công việc đang làm
            </label>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Chọn việc trong lịch hôm nay để theo dõi từng bước hành động ngay khi chạy đồng hồ.
            </p>
            <select
              id="pomodoro-task-select"
              value={linkedTaskId ?? ''}
              onChange={(e) => onSelectTask(e.target.value || null)}
              className="mt-3 w-full min-h-[46px] rounded-xl border border-zinc-200 bg-[#F7F7F5] px-3.5 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="">Tập trung tự do (không gắn việc)</option>
              {todayPendingTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.startTime} · {t.title}
                </option>
              ))}
            </select>
          </div>

          {linkedTask && (
            <div className="rounded-2xl bg-[#F7F7F5] p-4 dark:bg-zinc-950 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono tabular-nums text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {linkedTask.startTime} · {linkedTask.completedPomodoros ?? 0} phiên đã xong
                  </p>
                  <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {linkedTask.title}
                  </p>
                </div>
              </div>

              {linkedTask.actions.length > 0 && (
                <ul className="divide-y divide-zinc-200/70 dark:divide-zinc-800">
                  {linkedTask.actions.map((act) => (
                    <li key={act.id}>
                      <button
                        type="button"
                        onClick={() => onToggleAction(linkedTask.id, act.id)}
                        className="min-h-[44px] w-full flex items-center gap-2.5 py-1.5 text-left"
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

              {!isTaskCompletedOnDate(linkedTask, todayKey) && (
                <button
                  type="button"
                  onClick={() => onCompleteTask(linkedTask.id, todayKey)}
                  className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Đánh dấu xong công việc này
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
