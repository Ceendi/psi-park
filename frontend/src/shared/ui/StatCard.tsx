import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface StatCardProps {
  icon?: ReactNode;
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}

/** Dashboard metric tile (Client/Host panel — "4 StatCard"). */
export function StatCard({ icon, label, value, hint, className }: StatCardProps) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-lg border border-ink-100 bg-surface p-5', className)}>
      {icon && (
        <span className="grid size-10 place-items-center rounded-md bg-green-50 text-green-700">
          {icon}
        </span>
      )}
      <div>
        <div className="text-[28px] font-bold leading-none tracking-tight text-ink-900">{value}</div>
        <div className="mt-1.5 text-[13px] text-ink-500">{label}</div>
      </div>
      {hint && <div className="text-xs text-ink-500">{hint}</div>}
    </div>
  );
}
