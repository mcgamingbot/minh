import { SoundPreset, TaskPriority } from '../types/planner';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
}

export async function unlockAudio(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  return ctx.state === 'running';
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType,
  peakGain: number
) {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export async function playReminderChime(
  preset: SoundPreset,
  priority: TaskPriority
): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }

  const effectivePreset: SoundPreset =
    priority === 'urgent' ? 'urgent-pulse' : preset;

  if (effectivePreset === 'marimba') {
    // Warm pentatonic marimba triad (C5 - E5 - G5 - C6)
    playTone(ctx, 523.25, 0, 0.28, 'sine', 0.18);
    playTone(ctx, 659.25, 0.11, 0.28, 'sine', 0.18);
    playTone(ctx, 783.99, 0.22, 0.34, 'sine', 0.2);
    playTone(ctx, 1046.5, 0.34, 0.55, 'triangle', 0.14);
  } else if (effectivePreset === 'bell') {
    // Clear acoustic desk bell
    playTone(ctx, 880, 0, 0.7, 'sine', 0.2);
    playTone(ctx, 1318.5, 0.01, 0.5, 'sine', 0.1);
    playTone(ctx, 880, 0.38, 0.75, 'sine', 0.18);
  } else {
    // Urgent double-pulse attention chime
    playTone(ctx, 740, 0, 0.16, 'triangle', 0.22);
    playTone(ctx, 987.77, 0.14, 0.2, 'triangle', 0.24);
    playTone(ctx, 740, 0.42, 0.16, 'triangle', 0.22);
    playTone(ctx, 987.77, 0.56, 0.28, 'triangle', 0.25);
  }
}

export function triggerHaptic(priority: TaskPriority): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  if (priority === 'urgent') {
    navigator.vibrate([220, 100, 220, 100, 280]);
  } else if (priority === 'important') {
    navigator.vibrate([180, 90, 180]);
  } else {
    navigator.vibrate([140]);
  }
}
