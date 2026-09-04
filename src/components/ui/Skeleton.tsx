import React from 'react';

interface SkeletonProps {
  className?: string;
  label?: string;
}

export function Skeleton({ className = '', label = 'Loading' }: SkeletonProps) {
  return <div aria-label={label} aria-busy="true" className={`shimmer rounded-2xl ${className}`} />;
}
