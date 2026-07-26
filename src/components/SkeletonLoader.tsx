import React from 'react';
import { motion } from 'motion/react';

export const SkeletonCard = () => (
  <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 w-full relative overflow-hidden">
    <motion.div
      initial={{ x: '-100%' }}
      animate={{ x: '100%' }}
      transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent z-10"
    />
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-white/5" />
        <div className="space-y-2">
          <div className="w-24 h-4 bg-white/5 rounded-md" />
          <div className="w-16 h-3 bg-white/5 rounded-md" />
        </div>
      </div>
      <div className="w-8 h-8 rounded-lg bg-white/5" />
    </div>
    <div className="space-y-2">
      <div className="w-full h-12 bg-white/5 rounded-xl" />
      <div className="w-2/3 h-4 bg-white/5 rounded-md" />
    </div>
  </div>
);

export const SkeletonList = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-zinc-900 border border-white/5 rounded-2xl p-4 w-full relative overflow-hidden flex items-center justify-between">
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', delay: i * 0.2 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent z-10"
        />
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white/5" />
          <div className="space-y-2">
            <div className="w-24 h-4 bg-white/5 rounded-md" />
            <div className="w-16 h-3 bg-white/5 rounded-md" />
          </div>
        </div>
        <div className="space-y-2 flex flex-col items-end">
          <div className="w-20 h-5 bg-white/5 rounded-md" />
          <div className="w-12 h-3 bg-white/5 rounded-md" />
        </div>
      </div>
    ))}
  </div>
);
