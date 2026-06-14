import { cn } from '@/shared/lib/cn';

export interface SpinnerProps {
  /** Pixel diameter (default 20). */
  size?: number;
  className?: string;
  label?: string;
}

/** Indeterminate loading spinner — track in a faded `currentColor`. */
export function Spinner({ size = 20, className, label = 'Ładowanie…' }: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex', className)}>
      <span
        className="animate-spin rounded-full border-[color-mix(in_srgb,currentColor_25%,transparent)] border-t-current"
        style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 8)) }}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
