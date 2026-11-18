export type TaskCategory = 'work' | 'personal' | 'health' | 'study';

export type TaskPriority = 'normal' | 'important' | 'urgent';

export type RepeatRule = 'none' | 'daily' | 'weekdays' | 'weekends';

export type SoundPreset = 'marimba' | 'bell' | 'urgent-pulse';

export interface SubAction {
  id: string;
  text: string;
  done: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  note?: string;
  date: string; // YYYY-MM-DD (base/start date)
  startTime: string; // HH:mm
  durationMinutes: number;
  category: TaskCategory;
  priority: TaskPriority;
  repeat: RepeatRule;
  reminderBeforeMinutes: number; // 0, 5, 10, 15, 30
  followUpAlert: boolean; // Nhắc lại sau 3 phút nếu chưa xác nhận bắt đầu
  actions: SubAction[];
  completedDates: string[]; // Date keys YYYY-MM-DD when completed (supports recurring tasks)
  startedDates?: Record<string, number>; // dateKey -> timestamp started
  snoozedUntil?: number; // epoch ms
  completedPomodoros?: number;
}

export type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroPreset {
  id: string;
  label: string;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}

export const POMODORO_PRESETS: PomodoroPreset[] = [
  { id: 'quick', label: '15 / 3', focusMinutes: 15, shortBreakMinutes: 3, longBreakMinutes: 10 },
  { id: 'classic', label: '25 / 5', focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 },
  { id: 'deep', label: '50 / 10', focusMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 20 },
];

export const POMODORO_MODE_LABELS: Record<PomodoroMode, string> = {
  focus: 'Tập trung',
  shortBreak: 'Nghỉ ngắn',
  longBreak: 'Nghỉ dài',
};

export interface PomodoroStats {
  dateKey: string;
  completedSessions: number;
  focusedMinutes: number;
}

export type ReminderTriggerType = 'pre' | 'ontime' | 'followup' | 'snooze';

export interface ActiveReminder {
  id: string;
  taskId: string;
  dateKey: string;
  type: ReminderTriggerType;
  triggeredAt: number;
  headline: string;
  detail: string;
}

export interface ReminderLogItem {
  id: string;
  taskId: string;
  taskTitle: string;
  type: ReminderTriggerType;
  timestamp: number;
  actionTaken?: string;
}

export interface AppSettings {
  soundEnabled: boolean;
  soundPreset: SoundPreset;
  vibrationEnabled: boolean;
  smartAutoPreReminder: boolean;
  theme: 'light' | 'dark';
}

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  work: 'Công việc',
  personal: 'Cá nhân',
  health: 'Sức khỏe',
  study: 'Học tập',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  normal: 'Bình thường',
  important: 'Quan trọng',
  urgent: 'Khẩn cấp',
};

export const REPEAT_LABELS: Record<RepeatRule, string> = {
  none: 'Chỉ một lần',
  daily: 'Hàng ngày',
  weekdays: 'Thứ 2 – Thứ 6',
  weekends: 'Cuối tuần',
};
