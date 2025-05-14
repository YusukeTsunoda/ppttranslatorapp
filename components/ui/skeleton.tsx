import { cn } from '@/lib/utils';
import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({
  className,
  children,
  ...props
}: SkeletonProps) {
  return (
    <div
      data-testid="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    >
      {children}
    </div>
  );
}
