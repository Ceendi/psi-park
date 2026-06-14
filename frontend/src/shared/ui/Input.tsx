import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

const FIELD_BASE =
  'w-full appearance-none bg-surface border border-ink-200 rounded-md text-[15px] text-ink-900 transition placeholder:text-ink-300 focus:outline-none focus:border-green-700 focus:ring-4 focus:ring-green-100 disabled:opacity-60 disabled:cursor-not-allowed';

const INVALID =
  'border-danger focus:border-danger focus:ring-[color-mix(in_srgb,var(--color-danger)_18%,transparent)]';

export interface InputProps extends ComponentPropsWithRef<'input'> {
  invalid?: boolean;
  /** Decorative icon shown inside the field on the left (e.g. search, calendar). */
  leadingIcon?: ReactNode;
  /** Interactive element on the right (e.g. password visibility toggle). */
  trailing?: ReactNode;
}

export function Input({
  invalid = false,
  leadingIcon,
  trailing,
  className,
  ...props
}: InputProps) {
  const field = (
    <input
      className={cn(
        FIELD_BASE,
        'px-4 py-3.5',
        leadingIcon && 'pl-11',
        trailing && 'pr-11',
        invalid && INVALID,
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );

  if (!leadingIcon && !trailing) return field;

  return (
    <div className="relative flex items-center">
      {leadingIcon && (
        <span className="pointer-events-none absolute left-3.5 text-ink-500">{leadingIcon}</span>
      )}
      {field}
      {trailing && <span className="absolute right-2">{trailing}</span>}
    </div>
  );
}

export interface TextareaProps extends ComponentPropsWithRef<'textarea'> {
  invalid?: boolean;
}

export function Textarea({ invalid = false, className, rows = 3, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(FIELD_BASE, 'px-4 py-3 resize-y', invalid && INVALID, className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}
