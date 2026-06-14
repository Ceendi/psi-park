import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Apply default inner padding (24px). */
  padded?: boolean;
  /** Hover-lift + pointer affordance for clickable cards. */
  interactive?: boolean;
}

/** Surface container (Design System.html `.card-block` / `.util-card`). */
export function Card({ padded = true, interactive = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-ink-100 bg-surface',
        padded && 'p-6',
        interactive && 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-3',
        className,
      )}
      {...props}
    />
  );
}
