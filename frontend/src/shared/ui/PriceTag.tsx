import { cn } from '@/shared/lib/cn';
import { formatPLN } from '@/shared/lib/money';

export interface PriceTagProps {
  amount: number | string;
  /** Unit suffix, e.g. "godzinę". Pass empty string to hide. */
  per?: string;
  className?: string;
}

/** "45 zł / godzinę" — the hourly price pattern from the cards. */
export function PriceTag({ amount, per = 'godzinę', className }: PriceTagProps) {
  return (
    <span className={cn('inline-flex items-baseline gap-1', className)}>
      <strong className="text-lg tracking-tight text-ink-900">{formatPLN(amount)}</strong>
      {per && <span className="text-[13px] text-ink-500"> / {per}</span>}
    </span>
  );
}
