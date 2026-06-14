import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

/** Content placeholder for the loading state (PLAN §6.5 — every view has one). */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-ink-100', className)}
      aria-hidden="true"
      {...props}
    />
  );
}
