'use client';

import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
}

export default function Card({ className = '', variant = 'default', children, ...props }: CardProps) {
  const variants = {
    default: 'bg-white rounded-lg p-6',
    bordered: 'bg-white border border-gray-200 rounded-lg p-6',
    elevated: 'bg-white shadow-md rounded-lg p-6'
  };
  
  return (
    <div className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
