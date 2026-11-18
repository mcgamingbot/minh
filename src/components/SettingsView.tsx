import React from 'react';
import { BellRing, Moon, RotateCcw, Sun, Volume2 } from 'lucide-react';
import { AppSettings, SoundPreset } from '../types/planner';
import { playReminderChime, unlockAudio } from '../utils/soundEngine';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsViewProps {
  settings: AppSettings;
  notificationPermission: NotificationPermission | 'unsupported';
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onRequestNotification: () => void;
  onTestReminder: () => void;
  onResetSampleData: () => void;
}

const SOUND_OPTIONS: { value: SoundPreset; label: string; desc: string }[] = [
  { value: 'marimba', label: 'Chuông gỗ ấm', desc: 'Nhẹ nhàng, dễ chịu cho lịch hàng ngày' },
  { value: 'bell', label: 'Chuông bàn rõ nét', desc: 'Âm thanh vang rõ, dễ chú ý' },
  { value: 'urgent-pulse', label: 'Nhịp khẩn cấp', desc: 'Nhấn mạnh 2 nhịp cho việc quan trọng' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  notificationPermission,
  onUpdateSettings,
  onRequestNotification,
  onTestReminder,
  onResetSampleData,
}) => {
  const handleSelectSound = async (preset: SoundPreset) => {
    onUpdateSettings({ soundPreset: preset, soundEnabled: true });
    await unlockAudio();
    await playReminderChime(preset, preset === 'urgent-pulse' ? 'urgent' : 'important');
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Cài đặt nhắc nhở & giao diện
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Tùy chỉnh âm báo trên điện thoại, quy tắc nhắc trước thông minh và chế độ hiển thị.
        </p>
      </div>

      {/* Sound & Haptics */}
      <section className="rounded-3xl border border-zinc-200/80 bg-white p-5 space-y-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Âm báo khi đến giờ
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Phát chuông tổng hợp tức thì không cần mạng
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => {
              if (e.target.checked) void unlockAudio();
              onUpdateSettings({ soundEnabled: e.target.checked });
            }}
            aria-label="Bật âm báo"
            className="h-5 w-5 rounded accent-blue-600"
          />
        </div>

        <div className="space-y-2">
          {SOUND_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => void handleSelectSound(opt.value)}
              className={`min-h-[52px] w-full flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                settings.soundPreset === opt.value
                  ? 'border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/30'
                  : 'border-zinc-200/80 bg-[#F7F7F5] hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800'
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {opt.label}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{opt.desc}</p>
              </div>
              <Volume2
                className={`h-4 w-4 shrink-0 ${
                  settings.soundPreset === opt.value
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-zinc-400'
                }`}
              />
            </button>
          ))}
        </div>

        <label className="min-h-[44px] pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Rung điện thoại khi nhắc
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Hoạt động trên các trình duyệt Android hỗ trợ rung
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.vibrationEnabled}
            onChange={(e) => onUpdateSettings({ vibrationEnabled: e.target.checked })}
            className="h-5 w-5 rounded accent-blue-600"
          />
        </label>

        <label className="min-h-[44px] pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Tự động nhắc sớm theo mức ưu tiên
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Việc Khẩn cấp tự nhắc trước 15p · Quan trọng nhắc trước 10p
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.smartAutoPreReminder}
            onChange={(e) => onUpdateSettings({ smartAutoPreReminder: e.target.checked })}
            className="h-5 w-5 rounded accent-blue-600"
          />
        </label>

        <div className="pt-2 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onTestReminder}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950"
          >
            <BellRing className="h-4 w-4" />
            Thử màn hình nhắc nhở
          </button>

          {notificationPermission !== 'granted' &&
            notificationPermission !== 'unsupported' && (
              <button
                type="button"
                onClick={onRequestNotification}
                className="min-h-[44px] rounded-xl border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              >
                Bật thông báo hệ thống
              </button>
            )}
        </div>
      </section>

      {/* Appearance & Mobile Install */}
      <section className="rounded-3xl border border-zinc-200/80 bg-white p-5 space-y-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Giao diện sáng / tối
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Tối ưu độ tương phản khi dùng ngoài trời hoặc ban đêm
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-[#F7F7F5] p-1 dark:bg-zinc-950">
            <button
              type="button"
              onClick={() => onUpdateSettings({ theme: 'light' })}
              className={`min-h-[40px] inline-flex items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                settings.theme === 'light'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              Sáng
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ theme: 'dark' })}
              className={`min-h-[40px] inline-flex items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                settings.theme === 'dark'
                  ? 'bg-zinc-800 text-zinc-50 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              Tối
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Dùng như ứng dụng điện thoại
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Lưu biểu tượng ra màn hình chính để mở toàn màn hình
            </p>
          </div>
          <PWAInstallButton />
        </div>
      </section>

      {/* Data Management */}
      <section className="rounded-3xl border border-zinc-200/80 bg-white p-5 flex flex-wrap items-center justify-between gap-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Khôi phục lịch mẫu ban đầu
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Tạo lại các khung giờ mẫu bám theo thời gian hiện tại
          </p>
        </div>
        <button
          type="button"
          onClick={onResetSampleData}
          className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <RotateCcw className="h-4 w-4" />
          Nạp lại lịch mẫu
        </button>
      </section>
    </div>
  );
};
