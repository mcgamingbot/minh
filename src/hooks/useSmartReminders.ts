import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActiveReminder,
  AppSettings,
  ReminderLogItem,
  ReminderTriggerType,
  TaskItem,
} from '../types/planner';
import { playReminderChime, triggerHaptic } from '../utils/soundEngine';
import {
  isTaskCompletedOnDate,
  parseTimeMinutes,
  taskOccursOnDate,
  toDateKey,
} from '../utils/timeUtils';

const FIRED_STORAGE_KEY = 'nhip_ngay_fired_reminders_v1';

interface UseSmartRemindersProps {
  tasks: TaskItem[];
  settings: AppSettings;
  onClearSnooze: (taskId: string) => void;
  onLogEvent: (entry: ReminderLogItem) => void;
}

export function useSmartReminders({
  tasks,
  settings,
  onClearSnooze,
  onLogEvent,
}: UseSmartRemindersProps) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [activeReminder, setActiveReminder] = useState<ActiveReminder | null>(null);
  const [queue, setQueue] = useState<ActiveReminder[]>([]);
  const firedRef = useRef<Set<string>>(new Set());

  // Restore fired reminders for today so page refreshes don't re-ring already fired alerts
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FIRED_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { date: string; keys: string[] };
        if (parsed.date === toDateKey(new Date())) {
          firedRef.current = new Set(parsed.keys);
        }
      }
    } catch {
      // Ignore storage parse failure
    }
  }, []);

  const persistFired = useCallback((todayKey: string) => {
    try {
      localStorage.setItem(
        FIRED_STORAGE_KEY,
        JSON.stringify({
          date: todayKey,
          keys: Array.from(firedRef.current),
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  const dispatchAlert = useCallback(
    (
      task: TaskItem,
      dateKey: string,
      type: ReminderTriggerType,
      headline: string,
      detail: string
    ) => {
      const alertObj: ActiveReminder = {
        id: `${task.id}-${type}-${Date.now()}`,
        taskId: task.id,
        dateKey,
        type,
        triggeredAt: Date.now(),
        headline,
        detail,
      };

      if (settings.soundEnabled) {
        void playReminderChime(settings.soundPreset, task.priority);
      }
      if (settings.vibrationEnabled) {
        triggerHaptic(task.priority);
      }

      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(headline, {
            body: `${task.title}${detail ? ` · ${detail}` : ''}`,
            icon: '/pwa-192x192.png',
            tag: `${task.id}-${type}`,
          });
        } catch {
          // Some mobile browsers require ServiceWorkerRegistration.showNotification
        }
      }

      onLogEvent({
        id: alertObj.id,
        taskId: task.id,
        taskTitle: task.title,
        type,
        timestamp: alertObj.triggeredAt,
      });

      setActiveReminder((prev) => {
        if (!prev) return alertObj;
        setQueue((q) => [...q, alertObj]);
        return prev;
      });
    },
    [onLogEvent, settings.soundEnabled, settings.soundPreset, settings.vibrationEnabled]
  );

  // 1-second real-time ticker & smart reminder evaluation
  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = new Date();
      setNow(current);

      const todayKey = toDateKey(current);
      const currentTotalSeconds =
        current.getHours() * 3600 +
        current.getMinutes() * 60 +
        current.getSeconds();
      const currentEpochMs = current.getTime();

      for (const task of tasks) {
        if (!taskOccursOnDate(task, todayKey)) continue;
        if (isTaskCompletedOnDate(task, todayKey)) continue;

        const startSecs = parseTimeMinutes(task.startTime) * 60;
        const effectivePreMins =
          task.reminderBeforeMinutes > 0
            ? task.reminderBeforeMinutes
            : settings.smartAutoPreReminder && task.priority === 'urgent'
            ? 15
            : settings.smartAutoPreReminder && task.priority === 'important'
            ? 10
            : 0;

        const pendingActionsCount = task.actions.filter((a) => !a.done).length;
        const pendingSuffix =
          pendingActionsCount > 0
            ? `Còn ${pendingActionsCount} hành động cần chuẩn bị`
            : 'Tất cả bước chuẩn bị đã sẵn sàng';

        // 1. Snoozed alarm trigger
        if (task.snoozedUntil && currentEpochMs >= task.snoozedUntil) {
          const snoozeKey = `${todayKey}:${task.id}:snooze:${task.snoozedUntil}`;
          if (!firedRef.current.has(snoozeKey)) {
            firedRef.current.add(snoozeKey);
            persistFired(todayKey);
            onClearSnooze(task.id);
            dispatchAlert(
              task,
              todayKey,
              'snooze',
              'Nhắc lại công việc',
              `Đã hết thời gian báo lại · ${pendingSuffix}`
            );
          }
          continue;
        }

        // 2. Smart Pre-Reminder (fires inside a 45-second window)
        if (effectivePreMins > 0) {
          const preSecs = startSecs - effectivePreMins * 60;
          if (
            currentTotalSeconds >= preSecs &&
            currentTotalSeconds < preSecs + 45
          ) {
            const preKey = `${todayKey}:${task.id}:pre:${effectivePreMins}`;
            if (!firedRef.current.has(preKey)) {
              firedRef.current.add(preKey);
              persistFired(todayKey);
              dispatchAlert(
                task,
                todayKey,
                'pre',
                `Còn ${effectivePreMins} phút nữa đến giờ`,
                `Bắt đầu lúc ${task.startTime} · ${pendingSuffix}`
              );
            }
          }
        }

        // 3. Exact On-Time Reminder
        if (
          currentTotalSeconds >= startSecs &&
          currentTotalSeconds < startSecs + 45
        ) {
          const ontimeKey = `${todayKey}:${task.id}:ontime`;
          if (!firedRef.current.has(ontimeKey)) {
            firedRef.current.add(ontimeKey);
            persistFired(todayKey);
            dispatchAlert(
              task,
              todayKey,
              'ontime',
              `Đến giờ thực hiện (${task.startTime})`,
              pendingSuffix
            );
          }
        }

        // 4. Smart Follow-up Nudge (3 minutes after start if followUpAlert is enabled and user hasn't started)
        const alreadyStarted = Boolean(task.startedDates?.[todayKey]);
        if (task.followUpAlert && !alreadyStarted) {
          const followSecs = startSecs + 3 * 60;
          if (
            currentTotalSeconds >= followSecs &&
            currentTotalSeconds < followSecs + 45
          ) {
            const followKey = `${todayKey}:${task.id}:followup`;
            if (!firedRef.current.has(followKey)) {
              firedRef.current.add(followKey);
              persistFired(todayKey);
              dispatchAlert(
                task,
                todayKey,
                'followup',
                'Nhắc lần 2 — Chưa bắt đầu',
                `Đã quá giờ ${task.startTime} 3 phút · ${pendingSuffix}`
              );
            }
          }
        }
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [dispatchAlert, onClearSnooze, persistFired, settings.smartAutoPreReminder, tasks]);

  const dismissCurrentReminder = useCallback(() => {
    setActiveReminder(() => {
      if (queue.length > 0) {
        const [next, ...rest] = queue;
        setQueue(rest);
        return next;
      }
      return null;
    });
  }, [queue]);

  const triggerTestReminder = useCallback(
    (task?: TaskItem) => {
      const todayKey = toDateKey(new Date());
      const fallbackTask: TaskItem = task ?? {
        id: 'demo-test',
        title: 'Họp chốt kế hoạch & kiểm tra hành động ưu tiên',
        date: todayKey,
        startTime: `${String(new Date().getHours()).padStart(2, '0')}:${String(
          new Date().getMinutes()
        ).padStart(2, '0')}`,
        durationMinutes: 30,
        category: 'work',
        priority: 'important',
        repeat: 'none',
        reminderBeforeMinutes: 10,
        followUpAlert: true,
        actions: [
          { id: 't1', text: 'Mở ghi chú cuộc họp', done: false },
          { id: 't2', text: 'Xác nhận 3 đầu việc chính', done: false },
        ],
        completedDates: [],
      };
      const pending = fallbackTask.actions.filter((a) => !a.done).length;
      dispatchAlert(
        fallbackTask,
        todayKey,
        'ontime',
        `Nhắc thử thông minh (${fallbackTask.startTime})`,
        pending > 0
          ? `Còn ${pending} hành động chưa đánh dấu`
          : 'Âm báo, rung và thông báo đang hoạt động tốt'
      );
    },
    [dispatchAlert]
  );

  return {
    now,
    activeReminder,
    pendingQueueCount: queue.length,
    dismissCurrentReminder,
    triggerTestReminder,
  };
}
