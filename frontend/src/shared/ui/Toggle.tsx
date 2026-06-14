import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface ToggleProps extends Omit<ComponentPropsWithRef<'input'>, 'type'> {
  label?: ReactNode;
}

/** On/off switch (Design System.html `.switch`). */
export function Toggle({ label, className, ...props }: ToggleProps) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5 text-sm text-ink-900', className)}>
      <span className="relative inline-block h-6 w-10 shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" {...props} />
        <span className="absolute inset-0 rounded-full bg-ink-200 transition peer-checked:bg-green-700 peer-focus-visible:ring-4 peer-focus-visible:ring-green-100" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 size-5 rounded-full bg-surface shadow-1 transition-transform peer-checked:translate-x-4" />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}
