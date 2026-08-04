/**
 * Haptic feedback utility for mobile devices.
 * Uses navigator.vibrate() on Android and falls back gracefully on iOS
 * (iOS doesn't support the Vibration API, but the Web Haptics API may
 * be available on newer devices).
 */

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [10, 30, 10],
  warning: [20, 40, 20],
  error: [40, 20, 40, 20, 40],
};

export function haptic(pattern: HapticPattern = 'light') {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(patterns[pattern]);
    }
  } catch {
    // Silently fail — haptics are a nice-to-have
  }
}

/** Hook for React components */
export function useHaptic() {
  return haptic;
}
