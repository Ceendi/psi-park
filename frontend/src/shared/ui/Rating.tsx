import { cn } from '@/shared/lib/cn';
import { StarFilledIcon, StarIcon } from './icons';

export interface RatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  /** Optional review count shown after the stars. */
  count?: number;
  size?: number;
  showValue?: boolean;
  className?: string;
}

const STARS = [1, 2, 3, 4, 5];

/** Star rating — read-only display or interactive input (PLAN §16.1). */
export function Rating({
  value,
  onChange,
  readOnly = !onChange,
  count,
  size = 16,
  showValue = false,
  className,
}: RatingProps) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="inline-flex items-center">
        {STARS.map((star) => {
          const filled = star <= Math.round(value);
          const Star = filled ? StarFilledIcon : StarIcon;
          if (readOnly) {
            return <Star key={star} size={size} className="text-sun" />;
          }
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange?.(star)}
              className="cursor-pointer p-0.5 text-sun transition hover:scale-110"
              aria-label={`Oceń na ${star}`}
            >
              <Star size={size} />
            </button>
          );
        })}
      </span>
      {showValue && (
        <span className="font-mono text-[13px] font-semibold text-ink-900">
          {value.toFixed(1).replace('.', ',')}
        </span>
      )}
      {count !== undefined && <span className="text-[13px] text-ink-500">· {count} recenzji</span>}
    </span>
  );
}
