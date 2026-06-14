import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-pill border border-transparent font-sans font-semibold leading-none whitespace-nowrap cursor-pointer transition active:translate-y-px disabled:opacity-45 disabled:pointer-events-none';

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-4 py-2.5 text-[13px]',
  md: 'px-[22px] py-3.5 text-[15px]',
  lg: 'px-7 py-[18px] text-base',
};

// Subtle inset highlight + shadow/2, exactly as in Design System.html.
const PRIMARY_SHADOW =
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_12px_rgba(20,30,20,0.06),0_2px_4px_rgba(20,30,20,0.04)]';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: cn('bg-green-700 text-bone hover:bg-green-800', PRIMARY_SHADOW),
  secondary: 'bg-surface text-ink-900 border-ink-200 hover:border-ink-900',
  ghost: 'bg-transparent text-green-800 hover:bg-green-50',
  danger:
    'bg-surface text-danger border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      className={cn(BASE, SIZES[size], VARIANTS[variant], fullWidth && 'w-full', className)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-[color-mix(in_srgb,currentColor_30%,transparent)] border-t-current"
          aria-hidden="true"
        />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
