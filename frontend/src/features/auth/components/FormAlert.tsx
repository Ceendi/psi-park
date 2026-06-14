import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

/** Form-level error banner (bad credentials, throttling, unmapped API errors). */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-md border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] font-medium text-danger-ink"
    >
      <AlertCircle className="mt-px size-4 shrink-0 text-danger" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
