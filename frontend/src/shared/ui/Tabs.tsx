import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface TabItem {
  value: string;
  label: ReactNode;
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Segmented tabs with counts (panel tabs "Nadchodzące / Zakończone / …"). */
export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn('inline-flex flex-wrap items-center gap-1 rounded-pill bg-ink-50 p-1', className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-medium transition',
              active ? 'bg-surface text-ink-900 shadow-1' : 'text-ink-500 hover:text-ink-900',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  'rounded-pill px-2 py-0.5 font-mono text-[11px]',
                  active ? 'bg-green-100 text-green-800' : 'bg-ink-100 text-ink-500',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
