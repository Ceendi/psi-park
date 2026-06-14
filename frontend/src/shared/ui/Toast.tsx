import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastOptions {
  title: ReactNode;
  description?: ReactNode;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem extends Required<Pick<ToastOptions, 'title' | 'variant'>> {
  id: number;
  description?: ReactNode;
}

interface ToastApi {
  toast: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

let nextId = 0;

const VARIANT_STYLES: Record<ToastVariant, { icon: ReactNode; accent: string }> = {
  success: { icon: <CheckCircle2 className="size-5 text-success" />, accent: 'border-l-success' },
  error: { icon: <XCircle className="size-5 text-danger" />, accent: 'border-l-danger' },
  info: { icon: <Info className="size-5 text-info" />, accent: 'border-l-info' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = 'info', duration = 4000 }: ToastOptions) => {
      const id = (nextId += 1);
      setToasts((current) => [...current, { id, title, description, variant }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastApi>(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function Toaster({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return createPortal(
    <div className="fixed bottom-4 right-4 z-[200] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'flex items-start gap-3 rounded-md border border-ink-100 border-l-4 bg-surface p-4 shadow-3',
            VARIANT_STYLES[t.variant].accent,
          )}
        >
          <span className="mt-0.5 shrink-0">{VARIANT_STYLES[t.variant].icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-900">{t.title}</p>
            {t.description && <p className="mt-0.5 text-[13px] text-ink-500">{t.description}</p>}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Zamknij powiadomienie"
            className="grid size-6 shrink-0 place-items-center rounded text-ink-300 transition hover:text-ink-700"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>.');
  }
  return ctx;
}
