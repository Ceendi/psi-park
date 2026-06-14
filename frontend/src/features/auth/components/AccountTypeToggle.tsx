import type { ReactNode } from 'react';
import { GardenIcon, PawIcon } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import type { RegisterRole } from '@/shared/api/types';

interface Option {
  value: RegisterRole;
  title: string;
  sub: string;
  icon: ReactNode;
}

const OPTIONS: Option[] = [
  { value: 'client', title: 'Klient', sub: 'Szukam ogrodu', icon: <PawIcon size={18} /> },
  { value: 'host', title: 'Gospodarz', sub: 'Wynajmuję ogród', icon: <GardenIcon size={18} /> },
];

export interface AccountTypeToggleProps {
  value: RegisterRole;
  onChange: (value: RegisterRole) => void;
}

/**
 * Segmented Klient / Gospodarz selector — the `.acc-toggle` control from
 * Register.html (PLAN §16.1.1). Native radios keep it keyboard-accessible.
 */
export function AccountTypeToggle({ value, onChange }: AccountTypeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Typ konta"
      className="mb-7 grid grid-cols-2 gap-1 rounded-md border border-ink-100 bg-ink-50 p-1"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <label
            key={opt.value}
            className={cn(
              'relative flex cursor-pointer items-center gap-2.5 rounded-sm px-4 py-3 text-left transition',
              active ? 'bg-surface text-ink-900 shadow-1' : 'text-ink-500 hover:text-ink-700',
            )}
          >
            <input
              type="radio"
              name="account-type"
              value={opt.value}
              checked={active}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-[8px] border transition',
                active
                  ? 'border-green-700 bg-green-700 text-bone'
                  : 'border-ink-100 bg-surface text-ink-500',
              )}
            >
              {opt.icon}
            </span>
            <span className="flex flex-col gap-px">
              <span className="text-sm font-semibold">{opt.title}</span>
              <span
                className={cn(
                  'font-mono text-[11px] uppercase tracking-[0.06em]',
                  active ? 'text-green-700' : 'text-ink-300',
                )}
              >
                {opt.sub}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
