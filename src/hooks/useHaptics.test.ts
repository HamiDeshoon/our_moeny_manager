import { describe, expect, it, vi } from 'vitest';
import { useHaptics } from './useHaptics';

describe('useHaptics', () => {
  it('uses short patterns for successful, error, and tab feedback', () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    const haptics = useHaptics();
    expect(haptics.success()).toBe(true);
    expect(vibrate).toHaveBeenLastCalledWith([12, 35, 24]);
    haptics.error(); expect(vibrate).toHaveBeenLastCalledWith([28, 36, 28]);
    haptics.tab(); expect(vibrate).toHaveBeenLastCalledWith(10);
  });

  it('is safe in a browser without vibration support', () => {
    Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true });
    expect(useHaptics().tab()).toBe(false);
  });
});
