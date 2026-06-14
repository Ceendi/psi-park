import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export interface StepperProps {
  steps: string[];
  /** Zero-based index of the active step. */
  current: number;
  className?: string;
}

/** Wizard progress 1·2·3 with an active ring (Booking Form stepper). */
export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <ol className={cn('flex items-center', className)}>
      {steps.map((label, index) => {
        const completed = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold transition',
                  completed && 'bg-green-700 text-bone',
                  active && 'bg-surface text-green-800 ring-2 ring-green-700',
                  !completed && !active && 'bg-ink-100 text-ink-500',
                )}
              >
                {completed ? <Check className="size-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  active ? 'text-ink-900' : 'text-ink-500',
                )}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <span
                className={cn(
                  'mx-4 h-px flex-1',
                  index < current ? 'bg-green-700' : 'bg-ink-200',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
