import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppSettings,
  POMODORO_MODE_LABELS,
  POMODORO_PRESETS,
  PomodoroMode,
  PomodoroPreset,
  PomodoroStats,
} from '../types/planner';
import { playReminderChime, triggerHaptic, unlockAudio } from '../utils/soundEngine';
import { toDateKey } from '../utils/timeUtils';

const POMODORO_STATE_KEY = 'nhip_ngay_pomodoro_state_v1';
const POMODORO_STATS_KEY = 'nhip_ngay_pomodoro_stats_v1';

interface StoredPomodoroState {
  mode: PomodoroMode;
  presetId: string;
  customFocusMinutes?: number;
  isRunning: boolean;
  endTimeMs: number | null;
  pausedRemainingSecs: number;
  cycleCount: number; // 0..3 within a 4-session cycle
  linkedTaskId: string | null;
  autoContinue: boolean;
}

interface UsePomodoroProps {
  settings: AppSettings;
  onFocusSessionCompleted?: (taskId: string | null, minutes: number) => void;
}

export function usePomodoro({ settings, onFocusSessionCompleted }: UsePomodoroProps) {
  const [presetId, setPresetId] = useState<string>('classic');
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [endTimeMs, setEndTimeMs] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(25 * 60);
  const [cycleCount, setCycleCount] = useState<number>(0);
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);
  const [autoContinue, setAutoContinue] = useState<boolean>(false);
  const [lastFinishedNotice, setLastFinishedNotice] = useState<string | null>(null);

  const [stats, setStats] = useState<PomodoroStats>(() => {
    const todayKey = toDateKey(new Date());
    try {
      const raw = localStorage.getItem(POMODORO_STATS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PomodoroStats;
        if (parsed.dateKey === todayKey) return parsed;
      }
    } catch {
      // Ignore error
    }
    return { dateKey: todayKey, completedSessions: 0, focusedMinutes: 0 };
  });

  const completedCallbackRef = useRef(onFocusSessionCompleted);
  completedCallbackRef.current = onFocusSessionCompleted;

  const getPreset = useCallback(
    (id: string): PomodoroPreset =>
      POMODORO_PRESETS.find((p) => p.id === id) ?? POMODORO_PRESETS[1],
    []
  );

  const getDurationForMode = useCallback(
    (m: PomodoroMode, pId: string): number => {
      const p = getPreset(pId);
      if (m === 'focus') return p.focusMinutes * 60;
      if (m === 'shortBreak') return p.shortBreakMinutes * 60;
      return p.longBreakMinutes * 60;
    },
    [getPreset]
  );

  // Restore saved Pomodoro state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POMODORO_STATE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as StoredPomodoroState;
      setPresetId(saved.presetId || 'classic');
      setMode(saved.mode || 'focus');
      setCycleCount(saved.cycleCount || 0);
      setLinkedTaskId(saved.linkedTaskId ?? null);
      setAutoContinue(Boolean(saved.autoContinue));

      if (saved.isRunning && saved.endTimeMs) {
        const left = Math.max(0, Math.ceil((saved.endTimeMs - Date.now()) / 1000));
        if (left > 0) {
          setEndTimeMs(saved.endTimeMs);
          setRemainingSeconds(left);
          setIsRunning(true);
        } else {
          setIsRunning(false);
          setEndTimeMs(null);
          setRemainingSeconds(getDurationForMode(saved.mode || 'focus', saved.presetId || 'classic'));
        }
      } else {
        setIsRunning(false);
        setEndTimeMs(null);
        setRemainingSeconds(
          saved.pausedRemainingSecs > 0
            ? saved.pausedRemainingSecs
            : getDurationForMode(saved.mode || 'focus', saved.presetId || 'classic')
        );
      }
    } catch {
      // Ignore error
    }
  }, [getDurationForMode]);

  // Persist Pomodoro state
  useEffect(() => {
    try {
      const payload: StoredPomodoroState = {
        mode,
        presetId,
        isRunning,
        endTimeMs,
        pausedRemainingSecs: remainingSeconds,
        cycleCount,
        linkedTaskId,
        autoContinue,
      };
      localStorage.setItem(POMODORO_STATE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
    }
  }, [mode, presetId, isRunning, endTimeMs, remainingSeconds, cycleCount, linkedTaskId, autoContinue]);

  useEffect(() => {
    try {
      localStorage.setItem(POMODORO_STATS_KEY, JSON.stringify(stats));
    } catch {
      // Ignore quota errors
    }
  }, [stats]);

  const handlePhaseComplete = useCallback(
    (finishedMode: PomodoroMode, currentPresetId: string, currentCycle: number, taskId: string | null) => {
      const preset = getPreset(currentPresetId);

      if (settings.soundEnabled) {
        void playReminderChime(
          settings.soundPreset,
          finishedMode === 'focus' ? 'important' : 'normal'
        );
      }
      if (settings.vibrationEnabled) {
        triggerHaptic(finishedMode === 'focus' ? 'important' : 'normal');
      }

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(
            finishedMode === 'focus'
              ? 'Xong 1 phiên Pomodoro!'
              : 'Hết giờ nghỉ — Sẵn sàng phiên mới',
            {
              body:
                finishedMode === 'focus'
                  ? `Bạn đã tập trung ${preset.focusMinutes} phút. Nghỉ ngơi một chút nhé.`
                  : 'Quay lại nhịp tập trung cho công việc tiếp theo.',
              icon: '/pwa-192x192.png',
              tag: 'nhip-ngay-pomodoro',
            }
          );
        } catch {
          // Ignore mobile notification error
        }
      }

      let nextMode: PomodoroMode = 'focus';
      let nextCycle = currentCycle;

      if (finishedMode === 'focus') {
        const todayKey = toDateKey(new Date());
        setStats((prev) => {
          const base =
            prev.dateKey === todayKey
              ? prev
              : { dateKey: todayKey, completedSessions: 0, focusedMinutes: 0 };
          return {
            dateKey: todayKey,
            completedSessions: base.completedSessions + 1,
            focusedMinutes: base.focusedMinutes + preset.focusMinutes,
          };
        });
        completedCallbackRef.current?.(taskId, preset.focusMinutes);

        nextCycle = currentCycle + 1;
        if (nextCycle >= 4) {
          nextMode = 'longBreak';
          nextCycle = 0;
        } else {
          nextMode = 'shortBreak';
        }
        setLastFinishedNotice(
          `Đã xong phiên tập trung ${preset.focusMinutes} phút. Chuyển sang ${POMODORO_MODE_LABELS[nextMode].toLowerCase()}.`
        );
      } else {
        nextMode = 'focus';
        setLastFinishedNotice('Hết giờ nghỉ! Bấm Bắt đầu để vào phiên tập trung mới.');
      }

      const nextSecs = getDurationForMode(nextMode, currentPresetId);
      setCycleCount(nextCycle);
      setMode(nextMode);
      setRemainingSeconds(nextSecs);

      if (autoContinue) {
        const nextEnd = Date.now() + nextSecs * 1000;
        setEndTimeMs(nextEnd);
        setIsRunning(true);
      } else {
        setEndTimeMs(null);
        setIsRunning(false);
      }
    },
    [autoContinue, getDurationForMode, getPreset, settings.soundEnabled, settings.soundPreset, settings.vibrationEnabled]
  );

  // Accurate timestamp-based tick
  useEffect(() => {
    if (!isRunning || !endTimeMs) return;

    const interval = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endTimeMs - Date.now()) / 1000));
      setRemainingSeconds(left);
      if (left <= 0) {
        window.clearInterval(interval);
        handlePhaseComplete(mode, presetId, cycleCount, linkedTaskId);
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [isRunning, endTimeMs, mode, presetId, cycleCount, linkedTaskId, handlePhaseComplete]);

  const startOrResume = useCallback(async () => {
    await unlockAudio();
    setLastFinishedNotice(null);
    const secs = remainingSeconds > 0 ? remainingSeconds : getDurationForMode(mode, presetId);
    setEndTimeMs(Date.now() + secs * 1000);
    setIsRunning(true);
  }, [getDurationForMode, mode, presetId, remainingSeconds]);

  const pause = useCallback(() => {
    if (endTimeMs) {
      setRemainingSeconds(Math.max(0, Math.ceil((endTimeMs - Date.now()) / 1000)));
    }
    setEndTimeMs(null);
    setIsRunning(false);
  }, [endTimeMs]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setEndTimeMs(null);
    setLastFinishedNotice(null);
    setRemainingSeconds(getDurationForMode(mode, presetId));
  }, [getDurationForMode, mode, presetId]);

  const switchMode = useCallback(
    (nextMode: PomodoroMode) => {
      setIsRunning(false);
      setEndTimeMs(null);
      setLastFinishedNotice(null);
      setMode(nextMode);
      setRemainingSeconds(getDurationForMode(nextMode, presetId));
    },
    [getDurationForMode, presetId]
  );

  const selectPreset = useCallback(
    (nextPresetId: string) => {
      setIsRunning(false);
      setEndTimeMs(null);
      setLastFinishedNotice(null);
      setPresetId(nextPresetId);
      setRemainingSeconds(getDurationForMode(mode, nextPresetId));
    },
    [getDurationForMode, mode]
  );

  const skipPhase = useCallback(() => {
    const nextMode: PomodoroMode =
      mode === 'focus' ? (cycleCount + 1 >= 4 ? 'longBreak' : 'shortBreak') : 'focus';
    if (mode === 'focus') {
      setCycleCount((c) => (c + 1 >= 4 ? 0 : c + 1));
    }
    setIsRunning(false);
    setEndTimeMs(null);
    setLastFinishedNotice(null);
    setMode(nextMode);
    setRemainingSeconds(getDurationForMode(nextMode, presetId));
  }, [cycleCount, getDurationForMode, mode, presetId]);

  const startForTask = useCallback(
    async (taskId: string) => {
      await unlockAudio();
      const focusSecs = getDurationForMode('focus', presetId);
      setLinkedTaskId(taskId);
      setMode('focus');
      setRemainingSeconds(focusSecs);
      setEndTimeMs(Date.now() + focusSecs * 1000);
      setIsRunning(true);
      setLastFinishedNotice(null);
    },
    [getDurationForMode, presetId]
  );

  const totalModeSeconds = getDurationForMode(mode, presetId);
  const activePreset = getPreset(presetId);

  return {
    mode,
    presetId,
    activePreset,
    isRunning,
    remainingSeconds,
    totalModeSeconds,
    cycleCount,
    linkedTaskId,
    autoContinue,
    stats,
    lastFinishedNotice,
    setLinkedTaskId,
    setAutoContinue,
    setLastFinishedNotice,
    startOrResume,
    pause,
    reset,
    switchMode,
    selectPreset,
    skipPhase,
    startForTask,
  };
}
