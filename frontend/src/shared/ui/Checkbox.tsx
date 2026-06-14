import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type'> {
  label?: ReactNode;
}

/** Checkbox matching Design System.html — custom box with a green checked state. */
export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label className={cn('inline-flex cursor-pointer items-start gap-2.5 text-sm text-ink-900', className)}>
      <span className="relative mt-px inline-block size-5 shrink-0">
        <input type="checkbox" className="peer sr-only" {...props} />
        <span className="absolute inset-0 rounded-[6px] border-[1.5px] border-ink-300 bg-surface transition peer-checked:border-green-700 peer-checked:bg-green-700 peer-focus-visible:ring-4 peer-focus-visible:ring-green-100" />
        <svg
          className="pointer-events-none absolute inset-0 m-auto size-3 text-bone opacity-0 transition-opacity peer-checked:opacity-100"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12l5 5L20 7" />
        </svg>
      </span>
      {label && <span className="leading-relaxed">{label}</span>}
    </label>
  );
}
