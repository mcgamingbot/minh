import React, { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Sparkles, Trash2, X } from 'lucide-react';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  REPEAT_LABELS,
  RepeatRule,
  SubAction,
  TaskCategory,
  TaskItem,
  TaskPriority,
} from '../types/planner';
import {
  findConflicts,
  findNextFreeSlot,
  getEndTime,
  parseTimeMinutes,
} from '../utils/timeUtils';

interface TaskSheetModalProps {
  isOpen: boolean;
  initialTask: TaskItem | null;
  defaultDate: string;
  allTasks: TaskItem[];
  onClose: () => void;
  onSave: (task: TaskItem) => void;
}

const DURATION_PRESETS = [15, 30, 45, 60, 90];
const REMINDER_OFFSETS = [0, 5, 10, 15, 30];

export const TaskSheetModal: React.FC<TaskSheetModalProps> = ({
  isOpen,
  initialTask,
  defaultDate,
  allTasks,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [category, setCategory] = useState<TaskCategory>('work');
  const [priority, setPriority] = useState<TaskPriority>('important');
  const [repeat, setRepeat] = useState<RepeatRule>('none');
  const [reminderBeforeMinutes, setReminderBeforeMinutes] = useState(10);
  const [followUpAlert, setFollowUpAlert] = useState(true);
  const [actions, setActions] = useState<SubAction[]>([]);
  const [newActionText, setNewActionText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setNewActionText('');
    if (initialTask) {
      setTitle(initialTask.title);
      setNote(initialTask.note ?? '');
      setDate(initialTask.date);
      setStartTime(initialTask.startTime);
      setDurationMinutes(initialTask.durationMinutes);
      setCategory(initialTask.category);
      setPriority(initialTask.priority);
      setRepeat(initialTask.repeat);
      setReminderBeforeMinutes(initialTask.reminderBeforeMinutes);
      setFollowUpAlert(initialTask.followUpAlert);
      setActions(initialTask.actions);
    } else {
      const smartSlot = findNextFreeSlot(allTasks, defaultDate, 30);
      setTitle('');
      setNote('');
      setDate(defaultDate);
      setStartTime(smartSlot);
      setDurationMinutes(30);
      setCategory('work');
      setPriority('important');
      setRepeat('none');
      setReminderBeforeMinutes(10);
      setFollowUpAlert(true);
      setActions([]);
    }
  }, [isOpen, initialTask, defaultDate, allTasks]);

  if (!isOpen) return null;

  const conflicts = findConflicts(
    allTasks,
    date,
    startTime,
    durationMinutes,
    initialTask?.id
  );
  const suggestedFreeSlot =
    conflicts.length > 0
      ? findNextFreeSlot(
          allTasks,
          date,
          durationMinutes,
          parseTimeMinutes(startTime),
          initialTask?.id
        )
      : null;

  const handleAddAction = () => {
    const trimmed = newActionText.trim();
    if (!trimmed) return;
    setActions((prev) => [
      ...prev,
      { id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: trimmed, done: false },
    ]);
    setNewActionText('');
  };

  const handleRemoveAction = (id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg('Vui lòng nhập tên công việc.');
      return;
    }

    const pendingAction = newActionText.trim();
    const finalActions = pendingAction
      ? [
          ...actions,
          { id: `act-${Date.now()}`, text: pendingAction, done: false },
        ]
      : actions;

    const payload: TaskItem = {
      id: initialTask?.id ?? `task-${Date.now()}`,
      title: trimmedTitle,
      note: note.trim() || undefined,
      date,
      startTime,
      durationMinutes,
      category,
      priority,
      repeat,
      reminderBeforeMinutes,
      followUpAlert,
      actions: finalActions,
      completedDates: initialTask?.completedDates ?? [],
      startedDates: initialTask?.startedDates,
      snoozedUntil: initialTask?.snoozedUntil,
    };

    onSave(payload);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-sheet-title"
    >
      <div className="w-full sm:max-w-lg max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
        {/* Grab handle on mobile */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        {/* Sheet Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <h2
            id="task-sheet-title"
            className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
          >
            {initialTask ? 'Chỉnh sửa công việc' : 'Thêm công việc & hành động'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          {/* Title & Note */}
          <div className="space-y-3">
            <div>
              <label
                htmlFor="task-title-input"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Tên công việc
              </label>
              <input
                id="task-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Gọi đối tác xác nhận hợp đồng"
                className="w-full min-h-[46px] rounded-xl border border-zinc-200 bg-[#F7F7F5] px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="task-note-input"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Ghi chú bối cảnh (không bắt buộc)
              </label>
              <input
                id="task-note-input"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Chuẩn bị sẵn file báo giá PDF"
                className="w-full min-h-[44px] rounded-xl border border-zinc-200 bg-[#F7F7F5] px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-blue-500"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="task-date-input"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Ngày thực hiện
              </label>
              <input
                id="task-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[46px] rounded-xl border border-zinc-200 bg-[#F7F7F5] px-3 py-2 text-sm font-mono tabular-nums text-zinc-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor="task-time-input"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Giờ bắt đầu (đến {getEndTime(startTime, durationMinutes)})
              </label>
              <input
                id="task-time-input"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full min-h-[46px] rounded-xl border border-zinc-200 bg-[#F7F7F5] px-3 py-2 text-sm font-mono tabular-nums text-zinc-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Smart Conflict Warning & 1-Tap Auto-Fit */}
          {conflicts.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 dark:border-amber-800/70 dark:bg-amber-950/40">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    Trùng giờ với "{conflicts[0].title}" ({conflicts[0].startTime} –{' '}
                    {getEndTime(conflicts[0].startTime, conflicts[0].durationMinutes)})
                  </p>
                  {suggestedFreeSlot && (
                    <button
                      type="button"
                      onClick={() => setStartTime(suggestedFreeSlot)}
                      className="mt-2 min-h-[38px] inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 dark:bg-amber-400 dark:text-zinc-950"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Chuyển sang khung trống {suggestedFreeSlot}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Duration Selector */}
          <div>
            <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Thời lượng thực hiện
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {DURATION_PRESETS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`min-h-[44px] rounded-xl text-xs font-mono tabular-nums font-semibold transition-colors ${
                    durationMinutes === mins
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950'
                      : 'border border-zinc-200 bg-[#F7F7F5] text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300'
                  }`}
                >
                  {mins}p
                </button>
              ))}
            </div>
          </div>

          {/* Concrete Actions Builder */}
          <div>
            <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Các hành động cụ thể cần làm
            </span>
            {actions.length > 0 && (
              <ul className="mb-2.5 space-y-1.5">
                {actions.map((act, idx) => (
                  <li
                    key={act.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200/80 bg-[#F7F7F5] px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 min-w-0 flex-1">
                      {idx + 1}. {act.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAction(act.id)}
                      aria-label="Xóa bước hành động"
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newActionText}
                onChange={(e) => setNewActionText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAction();
                  }
                }}
                placeholder="Thêm bước hành động (vd: Mở file, Gọi điện)..."
                className="min-h-[44px] flex-1 rounded-xl border border-zinc-200 bg-[#F7F7F5] px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={handleAddAction}
                className="min-h-[44px] min-w-[44px] shrink-0 inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Smart Reminder Rules */}
          <div className="rounded-2xl border border-zinc-200/80 bg-[#F7F7F5] p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-950">
            <span className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Cài đặt nhắc nhở thông minh
            </span>

            <div>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
                Nhắc trước khi đến giờ
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {REMINDER_OFFSETS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setReminderBeforeMinutes(mins)}
                    className={`min-h-[40px] rounded-xl text-xs font-medium transition-colors ${
                      reminderBeforeMinutes === mins
                        ? 'bg-blue-600 text-white'
                        : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
                    }`}
                  >
                    {mins === 0 ? 'Đúng giờ' : `-${mins}p`}
                  </button>
                ))}
              </div>
            </div>

            <label className="min-h-[44px] flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-xs text-zinc-700 dark:text-zinc-300">
                Nhắc lại sau 3 phút nếu quá giờ chưa xác nhận bắt đầu
              </span>
              <input
                type="checkbox"
                checked={followUpAlert}
                onChange={(e) => setFollowUpAlert(e.target.checked)}
                className="h-5 w-5 rounded accent-blue-600 shrink-0"
              />
            </label>
          </div>

          {/* Category, Priority & Repeat */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Nhóm việc
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full min-h-[44px] rounded-xl border border-zinc-200 bg-[#F7F7F5] px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Mức ưu tiên
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full min-h-[44px] rounded-xl border border-zinc-200 bg-[#F7F7F5] px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              >
                {Object.entries(PRIORITY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Lặp lại
              </label>
              <select
                value={repeat}
                onChange={(e) => setRepeat(e.target.value as RepeatRule)}
                className="w-full min-h-[44px] rounded-xl border border-zinc-200 bg-[#F7F7F5] px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              >
                {Object.entries(REPEAT_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit Footer inside scroll or sticky */}
          <div className="pt-2 pb-safe flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="min-h-[48px] flex-[2] rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.99] transition-transform"
            >
              {initialTask ? 'Lưu thay đổi' : 'Lưu vào lịch trình'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
