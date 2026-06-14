import { DayPicker } from 'react-day-picker';
import type { Matcher } from 'react-day-picker';
import { pl } from 'date-fns/locale';
import 'react-day-picker/style.css';
import { cn } from '@/shared/lib/cn';

export interface DatePickerProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: Matcher | Matcher[];
  className?: string;
}

/** Single-date calendar (react-day-picker, Polish locale) themed in brand green. */
export function DatePicker({ selected, onSelect, disabled, className }: DatePickerProps) {
  return (
    <div
      className={cn(
        'inline-block rounded-lg border border-ink-100 bg-surface p-3 [--rdp-accent-background-color:var(--color-green-50)] [--rdp-accent-color:var(--color-green-700)]',
        className,
      )}
    >
      <DayPicker
        mode="single"
        locale={pl}
        selected={selected}
        onSelect={(date) => onSelect?.(date)}
        disabled={disabled}
        showOutsideDays
      />
    </div>
  );
}

export default DatePicker;
