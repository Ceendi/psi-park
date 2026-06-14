import { Component } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/shared/ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Top-level boundary so an unexpected render error shows a recovery screen
 * instead of a blank page (PLAN §6.5 — every view handles its error state). */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-bone px-6">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">Coś poszło nie tak</h1>
            <p className="mt-3 text-sm text-ink-500">
              Wystąpił nieoczekiwany błąd. Odśwież stronę — jeśli problem się powtarza, spróbuj
              ponownie później.
            </p>
            <Button className="mt-6" onClick={() => window.location.reload()}>
              Odśwież stronę
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
