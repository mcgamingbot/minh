import React from 'react';
import { ArrowRight, Calendar, Repeat } from 'lucide-react';
import { CATEGORY_LABELS, REPEAT_LABELS, TaskItem } from '../types/planner';
import {
  formatDurationVi,
  fromDateKey,
  getEndTime,
  isTaskCompletedOnDate,
  parseTimeMinutes,
  taskOccursOnDate,
  toDateKey,
} from '../utils/timeUtils';

interface ScheduleOverviewViewProps {
  tasks: TaskItem[];
  onJumpToDate: (dateKey: string) => void;
  onEditTask: (task: TaskItem) => void;
}

const WEEKDAY_VI = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

export const ScheduleOverviewView: React.FC<ScheduleOverviewViewProps> = ({
  tasks,
  onJumpToDate,
  onEditTask,
}) => {
  const today = new Date();
  const todayKey = toDateKey(today);

  const upcoming7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const key = toDateKey(d);
    const dayTasks = tasks
      .filter((t) => taskOccursOnDate(t, key))
      .sort((a, b) => parseTimeMinutes(a.startTime) - parseTimeMinutes(b.startTime));
    const totalMinutes = dayTasks.reduce((acc, t) => acc + t.durationMinutes, 0);
    const completedCount = dayTasks.filter((t) => isTaskCompletedOnDate(t, key)).length;
    return {
      dateKey: key,
      label: i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : WEEKDAY_VI[d.getDay()],
      dateText: `${d.getDate()}/${d.getMonth() + 1}`,
      tasks: dayTasks,
      totalMinutes,
      completedCount,
    };
  });

  const recurringTasks = tasks.filter((t) => t.repeat !== 'none');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Tổng quan lịch 7 ngày tới
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Theo dõi phân bổ thời gian theo từng ngày và chạm vào ngày bất kỳ để sắp xếp chi tiết.
        </p>
      </div>

      {/* 7-Day Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {upcoming7Days.map((day) => (
          <div
            key={day.dateKey}
            className={`rounded-2xl border p-4 transition-colors ${
              day.dateKey === todayKey
                ? 'border-blue-200 bg-white dark:border-blue-800/70 dark:bg-zinc-900'
                : 'border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {day.label}{' '}
                  <span className="font-mono tabular-nums font-medium text-zinc-500 dark:text-zinc-400">
                    ({day.dateText})
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {day.tasks.length} công việc
                  {day.totalMinutes > 0
                    ? ` · Tổng ${formatDurationVi(day.totalMinutes)}`
                    : ' · Ngày trống'}
                  {day.completedCount > 0 ? ` · Xong ${day.completedCount}` : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onJumpToDate(day.dateKey)}
                className="min-h-[40px] inline-flex items-center gap-1 rounded-xl bg-[#F7F7F5] px-3 text-xs font-semibold text-zinc-800 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:text-zinc-200"
              >
                Mở ngày
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {day.tasks.length > 0 ? (
              <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {day.tasks.slice(0, 4).map((t) => (
                  <li key={`${day.dateKey}-${t.id}`}>
                    <button
                      type="button"
                      onClick={() => onEditTask(t)}
                      className="min-h-[40px] w-full flex items-center justify-between gap-3 py-1.5 text-left hover:opacity-80"
                    >
                      <span
                        className={`text-sm truncate ${
                          isTaskCompletedOnDate(t, day.dateKey)
                            ? 'line-through text-zinc-400'
                            : 'text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        {t.title}
                      </span>
                      <span className="shrink-0 font-mono tabular-nums text-xs text-zinc-500 dark:text-zinc-400">
                        {t.startTime} – {getEndTime(t.startTime, t.durationMinutes)}
                      </span>
                    </button>
                  </li>
                ))}
                {day.tasks.length > 4 && (
                  <li className="pt-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                    +{day.tasks.length - 4} công việc khác
                  </li>
                )}
              </ul>
            ) : (
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
                <Calendar className="h-4 w-4" />
                Chưa có khung giờ nào được lên lịch
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recurring Routines */}
      {recurringTasks.length > 0 && (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Thói quen & công việc lặp lại ({recurringTasks.length})
            </h3>
          </div>
          <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            {recurringTasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onEditTask(task)}
                  className="min-h-[48px] w-full flex items-center justify-between gap-3 py-2 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {REPEAT_LABELS[task.repeat]} · {CATEGORY_LABELS[task.category]} · Nhắc trước{' '}
                      {task.reminderBeforeMinutes}p
                    </p>
                  </div>
                  <span className="shrink-0 font-mono tabular-nums text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {task.startTime}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quiet Helper Info */}
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        Hôm nay là {fromDateKey(todayKey).toLocaleDateString('vi-VN')}. Các công việc lặp lại tự động xuất hiện đúng thứ trong tuần.
      </p>
    </div>
  );
};
