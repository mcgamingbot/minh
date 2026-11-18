import { TaskItem } from '../types/planner';

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function parseTimeMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function minutesToHHMM(totalMinutes: number): string {
  const clamped = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getEndTime(startTime: string, durationMinutes: number): string {
  return minutesToHHMM(parseTimeMinutes(startTime) + durationMinutes);
}

export function formatDurationVi(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} giờ` : `${h}g ${m}p`;
}

const WEEKDAY_NAMES_FULL = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

const WEEKDAY_NAMES_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function formatDateHeaderVi(dateKey: string): string {
  const d = fromDateKey(dateKey);
  const todayKey = toDateKey(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toDateKey(tomorrow);

  const dayName = WEEKDAY_NAMES_FULL[d.getDay()];
  const datePart = `${d.getDate()} tháng ${d.getMonth() + 1}`;
  if (dateKey === todayKey) return `Hôm nay · ${dayName}, ${datePart}`;
  if (dateKey === tomorrowKey) return `Ngày mai · ${dayName}, ${datePart}`;
  return `${dayName}, ${datePart}`;
}

export function getDateStripDays(anchorDateKey: string, daysCount = 14) {
  const todayKey = toDateKey(new Date());
  const start = fromDateKey(todayKey);
  start.setDate(start.getDate() - 1); // Start from yesterday for quick context

  const days: {
    dateKey: string;
    dayShort: string;
    dayNum: number;
    isToday: boolean;
    isSelected: boolean;
  }[] = [];

  for (let i = 0; i < daysCount; i++) {
    const cur = new Date(start);
    cur.setDate(start.getDate() + i);
    const key = toDateKey(cur);
    days.push({
      dateKey: key,
      dayShort: WEEKDAY_NAMES_SHORT[cur.getDay()],
      dayNum: cur.getDate(),
      isToday: key === todayKey,
      isSelected: key === anchorDateKey,
    });
  }
  return days;
}

export function taskOccursOnDate(task: TaskItem, dateKey: string): boolean {
  if (dateKey < task.date) return false;
  if (task.repeat === 'none') return task.date === dateKey;
  if (task.repeat === 'daily') return true;

  const dayOfWeek = fromDateKey(dateKey).getDay(); // 0=Sun, 6=Sat
  if (task.repeat === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
  if (task.repeat === 'weekends') return dayOfWeek === 0 || dayOfWeek === 6;
  return false;
}

export function isTaskCompletedOnDate(task: TaskItem, dateKey: string): boolean {
  return task.completedDates.includes(dateKey);
}

export function findConflicts(
  tasks: TaskItem[],
  dateKey: string,
  startTime: string,
  durationMinutes: number,
  excludeId?: string
): TaskItem[] {
  const startA = parseTimeMinutes(startTime);
  const endA = startA + durationMinutes;

  return tasks
    .filter((t) => {
      if (t.id === excludeId) return false;
      if (!taskOccursOnDate(t, dateKey)) return false;
      const startB = parseTimeMinutes(t.startTime);
      const endB = startB + t.durationMinutes;
      return startA < endB && endA > startB;
    })
    .sort((a, b) => parseTimeMinutes(a.startTime) - parseTimeMinutes(b.startTime));
}

export function findNextFreeSlot(
  tasks: TaskItem[],
  dateKey: string,
  durationMinutes: number,
  minStartMinutes?: number,
  excludeId?: string
): string {
  const dayTasks = tasks
    .filter((t) => t.id !== excludeId && taskOccursOnDate(t, dateKey))
    .map((t) => ({
      start: parseTimeMinutes(t.startTime),
      end: parseTimeMinutes(t.startTime) + t.durationMinutes,
    }))
    .sort((a, b) => a.start - b.start);

  const now = new Date();
  const isToday = dateKey === toDateKey(now);
  const defaultMin = isToday ? now.getHours() * 60 + now.getMinutes() + 5 : 7 * 60;
  // Round up to nearest 5 minutes
  let candidate = Math.ceil((minStartMinutes ?? defaultMin) / 5) * 5;
  if (candidate < 6 * 60) candidate = 6 * 60;

  for (const block of dayTasks) {
    if (candidate + durationMinutes <= block.start) {
      return minutesToHHMM(candidate);
    }
    if (candidate < block.end) {
      candidate = Math.ceil(block.end / 5) * 5 + 5; // 5-minute smart buffer between tasks
    }
  }

  return minutesToHHMM(Math.min(candidate, 23 * 60 + 30));
}

export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${hrs}g ${String(mins).padStart(2, '0')}p`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
