import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Bell,
  CalendarCheck,
  CalendarDays,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Timer,
  WifiOff,
} from 'lucide-react';
import { ActiveReminderModal } from './components/ActiveReminderModal';
import { DateStrip } from './components/DateStrip';
import { NextUpRadar } from './components/NextUpRadar';
import { PomodoroView } from './components/PomodoroView';
import { RemindersCenterView } from './components/RemindersCenterView';
import { ScheduleOverviewView } from './components/ScheduleOverviewView';
import { SettingsView } from './components/SettingsView';
import { TaskSheetModal } from './components/TaskSheetModal';
import { TimelineTaskCard } from './components/TimelineTaskCard';
import { buildInitialTasks } from './data/defaultTasks';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { usePomodoro } from './hooks/usePomodoro';
import { useSmartReminders } from './hooks/useSmartReminders';
import { AppSettings, ReminderLogItem, TaskItem } from './types/planner';
import { unlockAudio } from './utils/soundEngine';
import {
  findConflicts,
  findNextFreeSlot,
  formatDateHeaderVi,
  formatDurationVi,
  isTaskCompletedOnDate,
  minutesToHHMM,
  parseTimeMinutes,
  taskOccursOnDate,
  toDateKey,
} from './utils/timeUtils';

const TASKS_STORAGE_KEY = 'nhip_ngay_tasks_v1';
const SETTINGS_STORAGE_KEY = 'nhip_ngay_settings_v1';
const LOGS_STORAGE_KEY = 'nhip_ngay_logs_v1';

type NavTab = 'today' | 'pomodoro' | 'schedule' | 'reminders' | 'settings';
type StatusFilter = 'all' | 'pending' | 'done';
type SortMode = 'time' | 'priority';

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  soundPreset: 'marimba',
  vibrationEnabled: true,
  smartAutoPreReminder: true,
  theme: 'light',
};

const PRIORITY_RANK = { urgent: 0, important: 1, normal: 2 };

export default function App() {
  const isOnline = useOnlineStatus();

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(TASKS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as TaskItem[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to initial schedule
    }
    return buildInitialTasks();
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...(JSON.parse(saved) as Partial<AppSettings>) };
    } catch {
      // Ignore parse error
    }
    return DEFAULT_SETTINGS;
  });

  const [logs, setLogs] = useState<ReminderLogItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOGS_STORAGE_KEY);
      if (saved) return JSON.parse(saved) as ReminderLogItem[];
    } catch {
      // Ignore parse error
    }
    return [];
  });

  const [activeTab, setActiveTab] = useState<NavTab>('today');
  const [selectedDate, setSelectedDate] = useState<string>(() => toDateKey(new Date()));
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('time');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  });

  // Persist tasks, settings, logs
  useEffect(() => {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // Ignore quota errors
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore quota errors
    }
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, 30)));
    } catch {
      // Ignore quota errors
    }
  }, [logs]);

  // Unlock Web Audio on first user touch/click on mobile
  useEffect(() => {
    const handleFirstTouch = async () => {
      const ok = await unlockAudio();
      if (ok) {
        setAudioUnlocked(true);
        window.removeEventListener('pointerdown', handleFirstTouch);
      }
    };
    window.addEventListener('pointerdown', handleFirstTouch, { passive: true });
    return () => window.removeEventListener('pointerdown', handleFirstTouch);
  }, []);

  const handleUnlockAudio = useCallback(async () => {
    const ok = await unlockAudio();
    setAudioUnlocked(ok);
  }, []);

  const handleRequestNotification = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
    } catch {
      // Ignore unsupported browser promise error
    }
  }, []);

  const handleClearSnooze = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, snoozedUntil: undefined } : t))
    );
  }, []);

  const handleLogEvent = useCallback((entry: ReminderLogItem) => {
    setLogs((prev) => [entry, ...prev].slice(0, 30));
  }, []);

  const handleFocusSessionCompleted = useCallback((taskId: string | null) => {
    if (!taskId) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, completedPomodoros: (t.completedPomodoros ?? 0) + 1 }
          : t
      )
    );
  }, []);

  const pomodoro = usePomodoro({
    settings,
    onFocusSessionCompleted: handleFocusSessionCompleted,
  });

  const {
    now,
    activeReminder,
    pendingQueueCount,
    dismissCurrentReminder,
    triggerTestReminder,
  } = useSmartReminders({
    tasks,
    settings,
    onClearSnooze: handleClearSnooze,
    onLogEvent: handleLogEvent,
  });

  // Task CRUD & Actions
  const handleSaveTask = (saved: TaskItem) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === saved.id);
      if (exists) {
        return prev.map((t) => (t.id === saved.id ? saved : t));
      }
      return [...prev, saved];
    });
    setSelectedDate(saved.date);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleToggleComplete = (taskId: string, dateKey: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const done = t.completedDates.includes(dateKey);
        return {
          ...t,
          snoozedUntil: undefined,
          completedDates: done
            ? t.completedDates.filter((d) => d !== dateKey)
            : [...t.completedDates, dateKey],
        };
      })
    );
  };

  const handleToggleAction = (taskId: string, actionId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          actions: t.actions.map((a) =>
            a.id === actionId ? { ...a, done: !a.done } : a
          ),
        };
      })
    );
  };

  const handleShiftTime = (taskId: string, deltaMinutes: number) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const currentMins = parseTimeMinutes(t.startTime);
        const nextMins = Math.max(0, Math.min(23 * 60 + 45, currentMins + deltaMinutes));
        return { ...t, startTime: minutesToHHMM(nextMins) };
      })
    );
  };

  const handleStartNow = (taskId: string, dateKey: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          snoozedUntil: undefined,
          startedDates: { ...(t.startedDates ?? {}), [dateKey]: Date.now() },
        };
      })
    );
    dismissCurrentReminder();
  };

  const handleStartPomodoroForTask = (taskId: string) => {
    const todayKey = toDateKey(new Date());
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              snoozedUntil: undefined,
              startedDates: { ...(t.startedDates ?? {}), [todayKey]: Date.now() },
            }
          : t
      )
    );
    void pomodoro.startForTask(taskId);
    dismissCurrentReminder();
    setActiveTab('pomodoro');
  };

  const handleSnooze = (taskId: string, minutes: number) => {
    const targetMs = Date.now() + minutes * 60 * 1000;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, snoozedUntil: targetMs } : t))
    );
    dismissCurrentReminder();
  };

  const handleSmartReschedule = (taskId: string, newStartTime: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, startTime: newStartTime, snoozedUntil: undefined }
          : t
      )
    );
    dismissCurrentReminder();
  };

  const handleAutoResolveConflicts = () => {
    setTasks((prev) => {
      const updated = [...prev];
      const dayIndices = updated
        .map((t, idx) => ({ t, idx }))
        .filter(({ t }) => taskOccursOnDate(t, selectedDate))
        .sort(
          (a, b) =>
            parseTimeMinutes(a.t.startTime) - parseTimeMinutes(b.t.startTime)
        );

      for (let i = 1; i < dayIndices.length; i++) {
        const current = updated[dayIndices[i].idx];
        const conflicts = findConflicts(
          updated,
          selectedDate,
          current.startTime,
          current.durationMinutes,
          current.id
        );
        if (conflicts.length > 0) {
          const nextSlot = findNextFreeSlot(
            updated,
            selectedDate,
            current.durationMinutes,
            parseTimeMinutes(current.startTime),
            current.id
          );
          updated[dayIndices[i].idx] = { ...current, startTime: nextSlot };
        }
      }
      return updated;
    });
  };

  // Computed Tasks for selected date
  const dayTasks = useMemo(() => {
    return tasks
      .filter((t) => taskOccursOnDate(t, selectedDate))
      .sort((a, b) => {
        if (sortMode === 'priority') {
          const diff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
          if (diff !== 0) return diff;
        }
        return parseTimeMinutes(a.startTime) - parseTimeMinutes(b.startTime);
      });
  }, [tasks, selectedDate, sortMode]);

  const filteredDayTasks = useMemo(() => {
    return dayTasks.filter((t) => {
      const done = isTaskCompletedOnDate(t, selectedDate);
      if (filter === 'pending') return !done;
      if (filter === 'done') return done;
      return true;
    });
  }, [dayTasks, filter, selectedDate]);

  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of dayTasks) {
      if (isTaskCompletedOnDate(t, selectedDate)) continue;
      const c = findConflicts(
        dayTasks,
        selectedDate,
        t.startTime,
        t.durationMinutes,
        t.id
      ).filter((other) => !isTaskCompletedOnDate(other, selectedDate));
      if (c.length > 0) ids.add(t.id);
    }
    return ids;
  }, [dayTasks, selectedDate]);

  const taskCountsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 1);
    for (let i = 0; i < 14; i++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + i);
      const key = toDateKey(cur);
      map[key] = tasks.filter(
        (t) => taskOccursOnDate(t, key) && !isTaskCompletedOnDate(t, key)
      ).length;
    }
    return map;
  }, [tasks]);

  const totalPlannedMinutes = dayTasks.reduce(
    (sum, t) => sum + t.durationMinutes,
    0
  );

  const activeReminderTask = activeReminder
    ? tasks.find((t) => t.id === activeReminder.taskId) ?? null
    : null;

  const openCreateModal = () => {
    setEditingTask(null);
    setSheetOpen(true);
  };

  const openEditModal = (task: TaskItem) => {
    setEditingTask(task);
    setSheetOpen(true);
  };

  return (
    <div className="min-h-dvh bg-[#F7F7F5] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-600 px-4 py-2 text-center text-xs font-medium text-white flex items-center justify-center gap-2">
          <WifiOff className="h-3.5 w-3.5" />
          Đang ngoại tuyến — Dữ liệu và âm báo vẫn hoạt động bình thường trên máy.
        </div>
      )}

      {/* Desktop Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="hidden lg:flex items-center justify-between gap-8 max-w-7xl mx-auto px-8 py-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('today');
          }}
          className="font-display text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 whitespace-nowrap shrink-0"
        >
          Nhịp Ngày
        </a>

        <nav
          aria-label="Điều hướng chính"
          className="flex items-center gap-7 text-sm font-medium text-zinc-600 dark:text-zinc-400"
        >
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
              activeTab === 'today'
                ? 'border-blue-600 text-zinc-900 font-semibold dark:text-zinc-50 dark:border-blue-400'
                : 'border-transparent hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pomodoro')}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
              activeTab === 'pomodoro'
                ? 'border-blue-600 text-zinc-900 font-semibold dark:text-zinc-50 dark:border-blue-400'
                : 'border-transparent hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Tập trung
            {pomodoro.isRunning && (
              <span className="ml-1.5 font-mono tabular-nums text-xs text-blue-600 dark:text-blue-400">
                {String(Math.floor(pomodoro.remainingSeconds / 60)).padStart(2, '0')}:
                {String(pomodoro.remainingSeconds % 60).padStart(2, '0')}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
              activeTab === 'schedule'
                ? 'border-blue-600 text-zinc-900 font-semibold dark:text-zinc-50 dark:border-blue-400'
                : 'border-transparent hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Lịch tuần
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reminders')}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
              activeTab === 'reminders'
                ? 'border-blue-600 text-zinc-900 font-semibold dark:text-zinc-50 dark:border-blue-400'
                : 'border-transparent hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Nhắc nhở
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
              activeTab === 'settings'
                ? 'border-blue-600 text-zinc-900 font-semibold dark:text-zinc-50 dark:border-blue-400'
                : 'border-transparent hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Cài đặt
          </button>
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={openCreateModal}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-transform whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            Thêm việc
          </button>
        </div>
      </header>

      {/* Mobile Top Bar (Non-sticky to honor 15% mobile sticky cap alongside bottom bar) */}
      <header className="lg:hidden pt-safe px-4 py-3.5 flex items-center justify-between gap-4 border-b border-zinc-200/70 bg-white dark:bg-zinc-900 dark:border-zinc-800">
        <span className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 whitespace-nowrap shrink-0">
          Nhịp Ngày
        </span>

        <button
          type="button"
          onClick={openCreateModal}
          className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-transform whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          Thêm việc
        </button>
      </header>

      {/* Main Content Workspace */}
      <main
        id="top"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-24 lg:pb-12"
      >
        {activeTab === 'today' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Right Rail on Desktop, First Spotlight on Mobile */}
            <div className="lg:col-span-5 xl:col-span-4 lg:order-2 space-y-4">
              <NextUpRadar
                now={now}
                tasks={tasks}
                settings={settings}
                notificationPermission={notificationPermission}
                audioUnlocked={audioUnlocked}
                onRequestNotification={() => void handleRequestNotification()}
                onUnlockAudio={() => void handleUnlockAudio()}
                onToggleSound={() =>
                  setSettings((prev) => ({
                    ...prev,
                    soundEnabled: !prev.soundEnabled,
                  }))
                }
                onTestReminder={triggerTestReminder}
                onToggleTaskDone={handleToggleComplete}
                onSelectTask={openEditModal}
                pomodoroPreview={{
                  isRunning: pomodoro.isRunning,
                  mode: pomodoro.mode,
                  remainingSeconds: pomodoro.remainingSeconds,
                  totalModeSeconds: pomodoro.totalModeSeconds,
                  linkedTaskTitle: tasks.find((t) => t.id === pomodoro.linkedTaskId)?.title,
                  onToggleRun: () =>
                    pomodoro.isRunning ? pomodoro.pause() : void pomodoro.startOrResume(),
                  onOpenPomodoro: () => setActiveTab('pomodoro'),
                }}
              />
            </div>

            {/* Main Schedule & Actions Column */}
            <div className="lg:col-span-7 xl:col-span-8 lg:order-1 space-y-5">
              {/* Day Header */}
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 text-balance">
                    {formatDateHeaderVi(selectedDate)}
                  </h1>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {dayTasks.length > 0
                      ? `${dayTasks.length} công việc · Tổng thời lượng ${formatDurationVi(
                          totalPlannedMinutes
                        )}`
                      : 'Chưa có công việc nào được xếp giờ cho ngày này'}
                  </p>
                </div>
              </div>

              {/* Horizontal Date Scroller */}
              <DateStrip
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                taskCountsByDate={taskCountsByDate}
              />

              {/* Smart Conflict Resolution Banner */}
              {conflictIds.size > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 flex flex-wrap items-center justify-between gap-3 dark:border-amber-800/70 dark:bg-amber-950/40">
                  <div>
                    <p className="text-sm font-semibold text-amber-950 dark:text-amber-200">
                      Phát hiện {conflictIds.size} công việc bị trùng khung giờ
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-300/80">
                      Tự động dời các việc bị trùng sang khung giờ trống gần nhất có khoảng nghỉ 5 phút.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoResolveConflicts}
                    className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-amber-900 px-3.5 text-xs font-semibold text-white hover:bg-amber-800 dark:bg-amber-400 dark:text-zinc-950 whitespace-nowrap"
                  >
                    <Sparkles className="h-4 w-4" />
                    Tự động xếp hết trùng
                  </button>
                </div>
              )}

              {/* Filter & Sort Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="inline-flex items-center gap-1 rounded-xl bg-zinc-200/70 p-1 dark:bg-zinc-900">
                  {(
                    [
                      { key: 'all', label: 'Tất cả' },
                      { key: 'pending', label: 'Chưa xong' },
                      { key: 'done', label: 'Đã xong' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFilter(item.key)}
                      className={`min-h-[38px] rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        filter === item.key
                          ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSortMode((prev) => (prev === 'time' ? 'priority' : 'time'))
                  }
                  className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 whitespace-nowrap shrink-0"
                >
                  <ArrowUpDown className="h-3.5 w-3.5 text-zinc-500" />
                  {sortMode === 'time' ? 'Xếp theo giờ' : 'Xếp theo ưu tiên'}
                </button>
              </div>

              {/* Timeline List */}
              {filteredDayTasks.length > 0 ? (
                <div className="space-y-3">
                  {filteredDayTasks.map((task) => (
                    <TimelineTaskCard
                      key={task.id}
                      task={task}
                      selectedDate={selectedDate}
                      now={now}
                      hasConflict={conflictIds.has(task.id)}
                      onToggleComplete={handleToggleComplete}
                      onToggleAction={handleToggleAction}
                      onShiftTime={handleShiftTime}
                      onStartPomodoro={handleStartPomodoroForTask}
                      onEdit={openEditModal}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-zinc-200/80 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {filter === 'all'
                      ? 'Ngày này chưa có lịch trình cụ thể'
                      : 'Không có công việc nào trong mục lọc này'}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Tạo công việc kèm thời gian cụ thể và danh sách hành động để hệ thống nhắc đúng giờ.
                  </p>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="mt-4 min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm công việc mới
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pomodoro' && (
          <PomodoroView
            mode={pomodoro.mode}
            presetId={pomodoro.presetId}
            activePreset={pomodoro.activePreset}
            isRunning={pomodoro.isRunning}
            remainingSeconds={pomodoro.remainingSeconds}
            totalModeSeconds={pomodoro.totalModeSeconds}
            cycleCount={pomodoro.cycleCount}
            linkedTaskId={pomodoro.linkedTaskId}
            autoContinue={pomodoro.autoContinue}
            stats={pomodoro.stats}
            lastFinishedNotice={pomodoro.lastFinishedNotice}
            tasks={tasks}
            onStartOrResume={() => void pomodoro.startOrResume()}
            onPause={pomodoro.pause}
            onReset={pomodoro.reset}
            onSwitchMode={pomodoro.switchMode}
            onSelectPreset={pomodoro.selectPreset}
            onSkipPhase={pomodoro.skipPhase}
            onSelectTask={pomodoro.setLinkedTaskId}
            onToggleAutoContinue={pomodoro.setAutoContinue}
            onDismissNotice={() => pomodoro.setLastFinishedNotice(null)}
            onToggleAction={handleToggleAction}
            onCompleteTask={handleToggleComplete}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleOverviewView
            tasks={tasks}
            onJumpToDate={(dateKey) => {
              setSelectedDate(dateKey);
              setActiveTab('today');
            }}
            onEditTask={openEditModal}
          />
        )}

        {activeTab === 'reminders' && (
          <RemindersCenterView
            now={now}
            tasks={tasks}
            settings={settings}
            logs={logs}
            notificationPermission={notificationPermission}
            onRequestNotification={() => void handleRequestNotification()}
            onTestReminder={triggerTestReminder}
            onEditTask={openEditModal}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            notificationPermission={notificationPermission}
            onUpdateSettings={(patch) =>
              setSettings((prev) => ({ ...prev, ...patch }))
            }
            onRequestNotification={() => void handleRequestNotification()}
            onTestReminder={() => triggerTestReminder()}
            onResetSampleData={() => {
              setTasks(buildInitialTasks());
              setSelectedDate(toDateKey(new Date()));
              setActiveTab('today');
            }}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (Thumb Zone Anchor, ≤ 15% cap) */}
      <nav
        aria-label="Điều hướng di động"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur-md pb-safe dark:border-zinc-800 dark:bg-zinc-900/95"
      >
        <div className="grid grid-cols-5 h-16 items-center">
          {(
            [
              { key: 'today', label: 'Hôm nay', Icon: CalendarCheck },
              { key: 'pomodoro', label: 'Pomodoro', Icon: Timer },
              { key: 'schedule', label: 'Lịch tuần', Icon: CalendarDays },
              { key: 'reminders', label: 'Nhắc nhở', Icon: Bell },
              { key: 'settings', label: 'Cài đặt', Icon: SlidersHorizontal },
            ] as const
          ).map(({ key, label, Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`min-h-[48px] flex flex-col items-center justify-center transition-colors ${
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.25]' : ''}`} />
                <span className="mt-1 text-[11px] font-medium tracking-tight leading-none whitespace-nowrap">
                  {key === 'pomodoro' && pomodoro.isRunning
                    ? `${String(Math.floor(pomodoro.remainingSeconds / 60)).padStart(2, '0')}:${String(
                        pomodoro.remainingSeconds % 60
                      ).padStart(2, '0')}`
                    : label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Add / Edit Task Bottom Sheet Modal */}
      <TaskSheetModal
        isOpen={sheetOpen}
        initialTask={editingTask}
        defaultDate={selectedDate}
        allTasks={tasks}
        onClose={() => setSheetOpen(false)}
        onSave={handleSaveTask}
      />

      {/* Smart Active Reminder Overlay */}
      <ActiveReminderModal
        reminder={activeReminder}
        task={activeReminderTask}
        allTasks={tasks}
        pendingQueueCount={pendingQueueCount}
        onStartNow={handleStartNow}
        onStartPomodoro={handleStartPomodoroForTask}
        onSnooze={handleSnooze}
        onSmartReschedule={handleSmartReschedule}
        onCompleteTask={(id, dateKey) => {
          handleToggleComplete(id, dateKey);
          dismissCurrentReminder();
        }}
        onToggleAction={handleToggleAction}
        onDismiss={dismissCurrentReminder}
      />
    </div>
  );
}
