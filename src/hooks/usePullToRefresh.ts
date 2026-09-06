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
      onPointerDown: (event) => {
        if (!enabled || isRefreshing || window.scrollY > 0) return;
        originY.current = event.clientY;
      },
      onPointerMove: (event) => {
        if (originY.current === null || isRefreshing) return;
        const distance = event.clientY - originY.current;
        if (distance > 0) setPullDistance(Math.min(distance * 0.42, 120));
      },
      onPointerCancel: () => { originY.current = null; setPullDistance(0); },
      onPointerUp: async () => {
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
