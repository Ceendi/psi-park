import { cn } from '@/shared/lib/cn';
import { scorePassword, STRENGTH_LABELS } from '../helpers';

// Fill colour for the lit segments, indexed by score (0 = none) — matches the
// `.pw-strength.s1…s4` rules in auth.css.
const SEGMENT_FILL = ['', 'bg-danger', 'bg-warning', 'bg-green-500', 'bg-green-700'] as const;
const LABEL_COLOR = [
  'text-ink-500',
  'text-danger',
  'text-warning',
  'text-green-600',
  'text-green-800',
] as const;

/** Four-segment password strength meter (PLAN §16.1.1, Register.html). */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const score = scorePassword(password);
  return (
    <div>
      <div className="mt-1.5 flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-200',
              i < score ? SEGMENT_FILL[score] : 'bg-ink-100',
            )}
          />
        ))}
      </div>
      <p className="mt-1.5 flex justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-ink-500">
        <span>Siła hasła</span>
        <span className={cn('font-semibold', LABEL_COLOR[score])}>{STRENGTH_LABELS[score]}</span>
      </p>
    </div>
  );
}
