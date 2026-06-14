import { useState } from 'react';
import { cn } from '@/shared/lib/cn';

export interface TimeSlot {
  /** Whole-hour start label, e.g. "15:00". */
  hour: string;
  available: boolean;
}

export interface TimeRange {
  start: string;
  /** Exclusive end boundary, e.g. start "15:00" + 2h → "17:00". */
  end: string;
}

export interface TimeRangePickerProps {
  slots: TimeSlot[];
  value?: TimeRange | null;
  onChange?: (range: TimeRange | null) => void;
  className?: string;
}

function addHour(hour: string): string {
  const h = Number.parseInt(hour.slice(0, 2), 10) + 1;
  return `${String(h).padStart(2, '0')}:00`;
}

function indexOfHour(slots: TimeSlot[], hour: string): number {
  return slots.findIndex((s) => s.hour === hour);
}

/**
 * Hour-chip range picker (PLAN §16.1): click a start chip then an end chip; the
 * span in between highlights; busy chips are disabled. A range never spans a
 * busy slot.
 */
export function TimeRangePicker({ slots, value, onChange, className }: TimeRangePickerProps) {
  const [anchor, setAnchor] = useState<string | null>(null);

  const startIdx = value ? indexOfHour(slots, value.start) : -1;
  // end is exclusive — the last highlighted chip is the one before it.
  const endIdx = value ? slots.findIndex((s) => s.hour === value.end) : -1;
  const lastHighlighted = endIdx === -1 && value ? slots.length - 1 : endIdx - 1;

  function isHighlighted(idx: number): boolean {
    if (!value || startIdx === -1) return false;
    return idx >= startIdx && idx <= lastHighlighted;
  }

  function rangeHasBusy(loIdx: number, hiIdx: number): boolean {
    return slots.slice(loIdx, hiIdx + 1).some((s) => !s.available);
  }

  function handleClick(hour: string, idx: number) {
    if (anchor === null) {
      setAnchor(hour);
      onChange?.({ start: hour, end: addHour(hour) });
      return;
    }
    const anchorIdx = indexOfHour(slots, anchor);
    const loIdx = Math.min(anchorIdx, idx);
    const hiIdx = Math.max(anchorIdx, idx);
    if (rangeHasBusy(loIdx, hiIdx)) {
      // Restart the selection from the new chip instead of crossing a busy slot.
      setAnchor(hour);
      onChange?.({ start: hour, end: addHour(hour) });
      return;
    }
    onChange?.({ start: slots[loIdx].hour, end: addHour(slots[hiIdx].hour) });
    setAnchor(null);
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="group" aria-label="Wybór godzin">
      {slots.map((slot, idx) => {
        const highlighted = isHighlighted(idx);
        return (
          <button
            key={slot.hour}
            type="button"
            disabled={!slot.available}
            aria-pressed={highlighted}
            onClick={() => handleClick(slot.hour, idx)}
            className={cn(
              'rounded-pill border px-3.5 py-2 font-mono text-[13px] transition',
              !slot.available && 'cursor-not-allowed border-ink-100 bg-ink-50 text-ink-300 line-through',
              slot.available &&
                !highlighted &&
                'border-ink-200 text-ink-700 hover:border-green-700 hover:text-green-800',
              highlighted && 'border-green-700 bg-green-700 text-bone',
            )}
          >
            {slot.hour}
          </button>
        );
      })}
    </div>
  );
}
