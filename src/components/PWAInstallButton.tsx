import React, { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return (
      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
        Đã cài đặt trên thiết bị
      </span>
    );
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
      >
        <Download className="h-4 w-4" />
        Cài đặt lên màn hình chính
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowIOSGuide(true)}
        className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 whitespace-nowrap"
      >
        <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        {isIOS ? 'Cách cài lên iPhone' : 'Cài app lên điện thoại'}
      </button>

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 pb-safe shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Cài đặt Nhịp Ngày lên điện thoại
              </h3>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                aria-label="Đóng hướng dẫn"
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-zinc-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 space-y-2.5 text-sm text-zinc-600 dark:text-zinc-300">
              {isIOS ? (
                <>
                  <p className="flex items-center gap-2">
                    1. Mở trang này bằng <strong>Safari</strong> và chạm nút{' '}
                    <Share className="inline h-4 w-4 text-blue-600" /> <strong>Chia sẻ</strong>.
                  </p>
                  <p>
                    2. Cuộn xuống chọn <strong>Thêm vào MH chính (Add to Home Screen)</strong>.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    1. Chạm biểu tượng menu <strong>⋮</strong> trên trình duyệt Chrome / Edge.
                  </p>
                  <p>
                    2. Chọn <strong>Cài đặt ứng dụng</strong> hoặc{' '}
                    <strong>Thêm vào màn hình chính</strong>.
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 min-h-[46px] w-full rounded-xl bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
};
