import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/shared/auth';
import { ToastProvider, Spinner } from '@/shared/ui';
import { createQueryClient } from '@/shared/lib/queryClient';
import { ErrorBoundary } from './ErrorBoundary';

const queryClient = createQueryClient();

function FullPageFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-bone text-green-700">
      <Spinner size={32} />
    </div>
  );
}

/** App-wide providers (PLAN §16.3): React Query, auth, toasts, error + suspense. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={<FullPageFallback />}>{children}</Suspense>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
