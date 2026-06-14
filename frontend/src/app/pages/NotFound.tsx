import { useNavigate } from 'react-router';
import { Button } from '@/shared/ui';

/** 404 — owned by F0 (PLAN §16.2 catch-all route). */
export function NotFound() {
  const navigate = useNavigate();
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <span className="font-mono text-6xl font-bold text-green-700">404</span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-900">
        Nie znaleźliśmy tej strony
      </h1>
      <p className="mt-3 text-ink-500">
        Strona mogła zostać przeniesiona lub nigdy nie istniała. Sprawdź adres albo wróć na stronę
        główną.
      </p>
      <Button className="mt-8" onClick={() => navigate('/')}>
        Wróć do strony głównej
      </Button>
    </section>
  );
}
