'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8'
};

export function LoadingSpinner({ 
  size = 'md', 
  className,
  text 
}: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center">
      <Loader2 
        className={cn(
          "animate-spin text-orange-500",
          sizeClasses[size],
          className
        )} 
      />
      {text && (
        <span className="ml-2 text-sm text-gray-600">{text}</span>
      )}
    </div>
  );
} 