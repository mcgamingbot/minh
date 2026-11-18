import { TaskItem } from '../types/planner';
import { minutesToHHMM, toDateKey } from '../utils/timeUtils';

export function buildInitialTasks(): TaskItem[] {
  const now = new Date();
  const todayKey = toDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Anchor a live upcoming task 12 minutes from current time so the smart countdown & pre-reminder can be experienced immediately
  const nearStart = Math.min(Math.ceil((nowMinutes + 12) / 5) * 5, 22 * 60);
  const laterStart = Math.min(nearStart + 65, 22 * 60 + 30);
  const afternoonStart = Math.max(14 * 60, Math.min(laterStart + 70, 23 * 60));

  return [
    {
      id: 'task-morning-plan',
      title: 'Rà soát mục tiêu & ưu tiên trong ngày',
      note: 'Chốt 3 việc quan trọng nhất trước khi mở email',
      date: todayKey,
      startTime: '07:30',
      durationMinutes: 25,
      category: 'work',
      priority: 'important',
      repeat: 'weekdays',
      reminderBeforeMinutes: 5,
      followUpAlert: false,
      actions: [
        { id: 'a1', text: 'Chọn 3 đầu việc bắt buộc xong hôm nay', done: true },
        { id: 'a2', text: 'Kiểm tra các cuộc họp có thay đổi giờ', done: true },
      ],
      completedDates: nowMinutes > 8 * 60 ? [todayKey] : [],
    },
    {
      id: 'task-next-focus',
      title: 'Xử lý công việc trọng tâm & báo cáo tiến độ',
      note: 'Tắt thông báo mạng xã hội trong phiên làm việc này',
      date: todayKey,
      startTime: minutesToHHMM(nearStart),
      durationMinutes: 45,
      category: 'work',
      priority: 'urgent',
      repeat: 'none',
      reminderBeforeMinutes: 10,
      followUpAlert: true,
      actions: [
        { id: 'b1', text: 'Mở tài liệu tổng hợp số liệu tuần', done: false },
        { id: 'b2', text: 'Cập nhật 3 gạch đầu dòng tiến độ chính', done: false },
        { id: 'b3', text: 'Gửi bản nháp qua nhóm dự án', done: false },
      ],
      completedDates: [],
    },
    {
      id: 'task-hydration-stretch',
      title: 'Nghỉ mắt, uống nước & giãn cơ cổ vai',
      note: 'Đứng dậy đi lại 5 phút để giữ nhịp tập trung',
      date: todayKey,
      startTime: minutesToHHMM(laterStart),
      durationMinutes: 15,
      category: 'health',
      priority: 'normal',
      repeat: 'daily',
      reminderBeforeMinutes: 5,
      followUpAlert: false,
      actions: [
        { id: 'c1', text: 'Uống 1 ly nước lọc đầy', done: false },
        { id: 'c2', text: 'Xoay vai và nhìn xa 20 giây', done: false },
      ],
      completedDates: [],
    },
    {
      id: 'task-deep-study',
      title: 'Đọc tài liệu chuyên môn & ghi chú hành động',
      note: 'Tóm tắt lại 2 ý áp dụng được ngay',
      date: todayKey,
      startTime: minutesToHHMM(afternoonStart),
      durationMinutes: 40,
      category: 'study',
      priority: 'important',
      repeat: 'none',
      reminderBeforeMinutes: 10,
      followUpAlert: true,
      actions: [
        { id: 'd1', text: 'Đọc hết chương đang dở', done: false },
        { id: 'd2', text: 'Viết 2 ghi chú áp dụng thực tế', done: false },
      ],
      completedDates: [],
    },
    {
      id: 'task-evening-walk',
      title: 'Đi bộ hoặc vận động nhẹ cuối ngày',
      date: todayKey,
      startTime: '18:00',
      durationMinutes: 35,
      category: 'health',
      priority: 'normal',
      repeat: 'daily',
      reminderBeforeMinutes: 15,
      followUpAlert: false,
      actions: [
        { id: 'e1', text: 'Thay đồ thể thao & mang nước', done: false },
        { id: 'e2', text: 'Hoàn thành tối thiểu 4.000 bước', done: false },
      ],
      completedDates: [],
    },
  ];
}
