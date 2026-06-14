import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
  /** Stack vertically (default) or lay out inline. */
  orientation?: 'vertical' | 'horizontal';
}

export function RadioGroup({
  name,
  options,
  value,
  defaultValue,
  onChange,
  className,
  orientation = 'vertical',
}: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'flex gap-x-7 gap-y-3',
        orientation === 'vertical' ? 'flex-col' : 'flex-wrap',
        className,
      )}
    >
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            'inline-flex cursor-pointer items-start gap-2.5 text-sm text-ink-900',
            opt.disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <span className="relative mt-px inline-block size-5 shrink-0">
            <input
              type="radio"
              name={name}
              value={opt.value}
              disabled={opt.disabled}
              className="peer sr-only"
              {...(value !== undefined
                ? { checked: value === opt.value, onChange: () => onChange?.(opt.value) }
                : { defaultChecked: defaultValue === opt.value, onChange: () => onChange?.(opt.value) })}
            />
            <span className="absolute inset-0 rounded-full border-[1.5px] border-ink-300 bg-surface transition peer-checked:border-green-700 peer-focus-visible:ring-4 peer-focus-visible:ring-green-100" />
            <span className="pointer-events-none absolute inset-0 m-auto size-2.5 rounded-full bg-green-700 opacity-0 transition-opacity peer-checked:opacity-100" />
          </span>
          <span className="leading-relaxed">
            {opt.label}
            {opt.description && <span className="block text-xs text-ink-500">{opt.description}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
