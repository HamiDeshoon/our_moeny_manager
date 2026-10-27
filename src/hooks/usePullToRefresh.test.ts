import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePullToRefresh } from './usePullToRefresh';

describe('usePullToRefresh', () => {
  it('returns initial state', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePullToRefresh({ enabled: true, onRefresh })
    );

    expect(result.current.pullDistance).toBe(0);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.bind).toBeDefined();
  });

  it('ignores touch events when disabled', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePullToRefresh({ enabled: false, onRefresh })
    );

    act(() => {
      result.current.bind.onTouchStart?.({
        touches: [{ clientY: 100 }] as any,
      } as any);
      result.current.bind.onTouchMove?.({
        touches: [{ clientY: 200 }] as any,
      } as any);
    });

    expect(result.current.pullDistance).toBe(0);
  });

  it('updates pullDistance when dragging down at top of page', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePullToRefresh({ enabled: true, threshold: 50, onRefresh })
    );

    act(() => {
      result.current.bind.onTouchStart?.({
        touches: [{ clientY: 100 }] as any,
      } as any);
    });

    act(() => {
      result.current.bind.onTouchMove?.({
        touches: [{ clientY: 200 }] as any,
      } as any);
    });

    expect(result.current.pullDistance).toBeGreaterThan(0);
  });

  it('resets distance on touch cancel', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePullToRefresh({ enabled: true, threshold: 50, onRefresh })
    );

    act(() => {
      result.current.bind.onTouchStart?.({
        touches: [{ clientY: 100 }] as any,
      } as any);
      result.current.bind.onTouchMove?.({
        touches: [{ clientY: 200 }] as any,
      } as any);
    });

    expect(result.current.pullDistance).toBeGreaterThan(0);

    act(() => {
      result.current.bind.onTouchCancel?.({} as any);
    });

    expect(result.current.pullDistance).toBe(0);
  });

  it('triggers onRefresh on touch end if threshold is met', async () => {
    const onRefresh = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => setTimeout(resolve, 10))
    );
    const { result } = renderHook(() =>
      usePullToRefresh({ enabled: true, threshold: 30, onRefresh })
    );

    act(() => {
      result.current.bind.onTouchStart?.({
        touches: [{ clientY: 100 }] as any,
      } as any);
    });

    act(() => {
      result.current.bind.onTouchMove?.({
        touches: [{ clientY: 200 }] as any,
      } as any);
    });

    await act(async () => {
      await result.current.bind.onTouchEnd?.({} as any);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.pullDistance).toBe(0);
    expect(result.current.isRefreshing).toBe(false);
  });
});
