import React from 'react';
import { Bell, BellRing, Clock, Sparkles } from 'lucide-react';
import { AppSettings, ReminderLogItem, TaskItem } from '../types/planner';
import {
  formatCountdown,
  isTaskCompletedOnDate,
  parseTimeMinutes,
  taskOccursOnDate,
  toDateKey,
} from '../utils/timeUtils';

interface RemindersCenterViewProps {
  now: Date;
  tasks: TaskItem[];
  settings: AppSettings;
  logs: ReminderLogItem[];
  notificationPermission: NotificationPermission | 'unsupported';
  onRequestNotification: () => void;
  onTestReminder: (task?: TaskItem) => void;
  onEditTask: (task: TaskItem) => void;
}

export const RemindersCenterView: React.FC<RemindersCenterViewProps> = ({
  now,
  tasks,
  settings,
  logs,
  notificationPermission,
  onRequestNotification,
  onTestReminder,
  onEditTask,
}) => {
  const todayKey = toDateKey(now);
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  const upcomingAlerts = tasks
    .filter((t) => taskOccursOnDate(t, todayKey) && !isTaskCompletedOnDate(t, todayKey))
    .flatMap((t) => {
      const startSecs = parseTimeMinutes(t.startTime) * 60;
      const preMins =
        t.reminderBeforeMinutes > 0
          ? t.reminderBeforeMinutes
          : settings.smartAutoPreReminder && t.priority === 'urgent'
          ? 15
          : settings.smartAutoPreReminder && t.priority === 'important'
          ? 10
          : 0;

      const items: {
        key: string;
        task: TaskItem;
        triggerSecs: number;
        label: string;
        triggerTimeText: string;
      }[] = [];

      if (preMins > 0 && startSecs - preMins * 60 > nowSeconds) {
        const preSecs = startSecs - preMins * 60;
        const hh = String(Math.floor(preSecs / 3600)).padStart(2, '0');
        const mm = String(Math.floor((preSecs % 3600) / 60)).padStart(2, '0');
        items.push({
          key: `${t.id}-pre`,
          task: t,
          triggerSecs: preSecs,
          label: `Nhắc trước ${preMins} phút`,
          triggerTimeText: `${hh}:${mm}`,
        });
      }

      if (startSecs > nowSeconds) {
        items.push({
          key: `${t.id}-ontime`,
          task: t,
          triggerSecs: startSecs,
          label: 'Nhắc đúng giờ',
          triggerTimeText: t.startTime,
        });
      }

      return items;
    })
    .sort((a, b) => a.triggerSecs - b.triggerSecs);

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Trung tâm nhắc nhở thông minh
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Tự động nhắc trước theo mức ưu tiên, kiểm tra các hành động còn thiếu và gợi ý giờ trống khi bạn bận.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onTestReminder(upcomingAlerts[0]?.task)}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-transform whitespace-nowrap"
          >
            <BellRing className="h-4 w-4" />
            Thử nhắc ngay
          </button>
        </div>

        {notificationPermission === 'default' && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-blue-50/90 p-3.5 dark:bg-blue-950/40">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-200">
              Cho phép thông báo trình duyệt để nhận nhắc giờ ngay cả khi bạn thu nhỏ màn hình điện thoại.
            </p>
            <button
              type="button"
              onClick={onRequestNotification}
              className="min-h-[40px] rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
            >
              Cấp quyền thông báo
            </button>
          </div>
        )}
      </div>

      {/* Upcoming Reminder Queue */}
      <section className="rounded-3xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Hàng đợi chuông nhắc hôm nay ({upcomingAlerts.length})
          </h3>
        </div>

        {upcomingAlerts.length > 0 ? (
          <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            {upcomingAlerts.map((item) => {
              const waitSecs = item.triggerSecs - nowSeconds;
              const pendingSteps = item.task.actions.filter((a) => !a.done).length;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => onEditTask(item.task)}
                    className="min-h-[56px] w-full flex items-center justify-between gap-3 py-2.5 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        <span className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-200">
                          {item.triggerTimeText}
                        </span>{' '}
                        · {item.label}
                        {pendingSteps > 0 ? ` · Còn ${pendingSteps} bước chuẩn bị` : ''}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {item.task.title}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono tabular-nums text-xs font-semibold text-blue-600 dark:text-blue-400">
                      Sau {formatCountdown(waitSecs)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Không còn chuông nhắc nào sắp tới trong hôm nay.
          </p>
        )}
      </section>

      {/* Recent Fired Log */}
      <section className="rounded-3xl border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-zinc-500" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Nhật ký đã nhắc gần đây
          </h3>
        </div>

        {logs.length > 0 ? (
          <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            {logs.slice(0, 10).map((log) => (
              <li key={log.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {log.taskTitle}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {log.type === 'pre'
                      ? 'Nhắc trước'
                      : log.type === 'followup'
                      ? 'Nhắc lần 2'
                      : log.type === 'snooze'
                      ? 'Báo lại'
                      : 'Đúng giờ'}
                    {log.actionTaken ? ` · ${log.actionTaken}` : ''}
                  </p>
                </div>
                <span className="shrink-0 font-mono tabular-nums text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(log.timestamp).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Bell className="h-4 w-4 shrink-0" />
            Chưa có nhắc nhở nào được kích hoạt trong phiên này. Bấm "Thử nhắc ngay" để kiểm tra.
          </div>
        )}
      </section>
    </div>
  );
};
