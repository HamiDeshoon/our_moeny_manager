export type HapticKind = 'success' | 'error' | 'tab';

export interface Haptics {
  trigger(kind: HapticKind): boolean;
  success(): boolean;
  error(): boolean;
  tab(): boolean;
}

const patterns: Record<HapticKind, number | number[]> = {
  success: [12, 35, 24],
  error: [28, 36, 28],
  tab: 10,
};

function vibrate(kind: HapticKind): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  return navigator.vibrate(patterns[kind]);
}

export function useHaptics(): Haptics {
  return {
    trigger: vibrate,
    success: () => vibrate('success'),
    error: () => vibrate('error'),
    tab: () => vibrate('tab'),
  };
}
