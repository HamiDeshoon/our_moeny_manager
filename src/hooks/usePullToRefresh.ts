import { useMemo, useRef, useState } from 'react';
import type React from 'react';

export interface PullToRefreshOptions {
  enabled: boolean;
  threshold?: number;
  onRefresh: () => Promise<void>;
}

export interface PullToRefreshResult {
  pullDistance: number;
  isRefreshing: boolean;
  bind: React.HTMLAttributes<HTMLElement>;
}

export function usePullToRefresh({ enabled, threshold = 72, onRefresh }: PullToRefreshOptions): PullToRefreshResult {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const originY = useRef<number | null>(null);

  return useMemo(() => ({
    pullDistance,
    isRefreshing,
    bind: {
      onTouchStart: (event: React.TouchEvent) => {
        if (!enabled || isRefreshing) return;
        const top = window.scrollY || document.documentElement.scrollTop || 0;
        if (top <= 2 && event.touches.length === 1) {
          originY.current = event.touches[0].clientY;
        } else {
          originY.current = null;
        }
      },
      onTouchMove: (event: React.TouchEvent) => {
        if (originY.current === null || isRefreshing || event.touches.length !== 1) return;
        const currentY = event.touches[0].clientY;
        const delta = currentY - originY.current;
        const top = window.scrollY || document.documentElement.scrollTop || 0;
        if (top <= 2 && delta > 8) {
          // Downward pull at top of page
          setPullDistance(Math.min(delta * 0.38, 110));
        } else if (delta < 0) {
          originY.current = null;
          setPullDistance(0);
        }
      },
      onTouchCancel: () => { originY.current = null; setPullDistance(0); },
      onTouchEnd: async () => {
        const shouldRefresh = originY.current !== null && pullDistance >= threshold && !isRefreshing;
        originY.current = null;
        if (!shouldRefresh) { setPullDistance(0); return; }
        setIsRefreshing(true);
        setPullDistance(threshold);
        try { await onRefresh(); } finally { setIsRefreshing(false); setPullDistance(0); }
      },
    },
  }), [enabled, isRefreshing, onRefresh, pullDistance, threshold]);
}
