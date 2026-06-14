import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'outline'
  | 'solid'
  | 'rating';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  leftIcon?: ReactNode;
}

const VARIANTS: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger-ink',
  info: 'bg-info-soft text-info-ink',
  neutral: 'bg-ink-100 text-ink-700',
  outline: 'bg-surface text-ink-900 border-ink-200',
  solid: 'bg-green-700 text-bone',
  rating: 'bg-surface text-ink-900 border-ink-200 [&>svg]:text-sun',
};

export function Badge({ variant = 'neutral', leftIcon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border border-transparent px-2.5 py-[5px] text-xs font-semibold leading-none',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {leftIcon}
      {children}
    </span>
  );
}
