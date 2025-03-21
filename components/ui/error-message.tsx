'use client';

import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  message: string;
  className?: string;
  variant?: 'default' | 'destructive';
}

export function ErrorMessage({ message, className, variant = 'default' }: ErrorMessageProps) {
  return (
    <div className={cn('rounded-md p-4', variant === 'destructive' ? 'bg-red-50' : 'bg-orange-50', className)}>
      <div className="flex">
        <AlertCircle
          className={cn('h-5 w-5 flex-shrink-0', variant === 'destructive' ? 'text-red-400' : 'text-orange-400')}
        />
        <div className="ml-3">
          <h3 className={cn('text-sm font-medium', variant === 'destructive' ? 'text-red-800' : 'text-orange-800')}>
            {message}
          </h3>
        </div>
      </div>
    </div>
  );
}
