import type { ComponentPropsWithRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export interface SelectProps extends ComponentPropsWithRef<'select'> {
  invalid?: boolean;
}

/** Native select styled to match the design-system fields. */
export function Select({ invalid = false, className, children, ...props }: SelectProps) {
  return (
    <div className="relative flex items-center">
      <select
        className={cn(
          'w-full appearance-none rounded-md border border-ink-200 bg-surface px-4 py-3.5 pr-10 text-[15px] text-ink-900 transition',
          'focus:border-green-700 focus:outline-none focus:ring-4 focus:ring-green-100',
          'disabled:cursor-not-allowed disabled:opacity-60',
          invalid &&
            'border-danger focus:border-danger focus:ring-[color-mix(in_srgb,var(--color-danger)_18%,transparent)]',
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3.5 size-[18px] text-ink-500"
        aria-hidden="true"
      />
    </div>
  );
}
