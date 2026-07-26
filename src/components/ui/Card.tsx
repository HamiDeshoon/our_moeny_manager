import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  noPadding?: boolean;
}

export function Card({ children, className = '', onClick, noPadding = false }: CardProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      onClick={onClick}
      className={`
        bg-zinc-900 border border-white/10 rounded-2xl shadow-sm
        ${onClick ? 'cursor-pointer hover:border-white/20 active:scale-[0.99] transition-all text-left w-full' : ''}
        ${!noPadding ? 'p-5' : ''}
        ${className}
      `}
    >
      {children}
    </Component>
  );
}
