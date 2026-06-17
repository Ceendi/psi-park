import type { DogHealthStatus } from '@/shared/api/types';

/**
 * Map the backend health-document statuses (PLAN §7.2) onto the coloured dots from
 * docs/design/project/Client Panel.html (`.pet-status.ok/.warn/.bad`). `valid →
 * ok`, `expiring_soon → warn`, `expired → bad`, `unknown → neutral`.
 */
export type HealthTone = 'ok' | 'warn' | 'bad' | 'neutral';

export function healthTone(status: string | null | undefined): HealthTone {
  switch (status as DogHealthStatus) {
    case 'valid':
      return 'ok';
    case 'expiring_soon':
      return 'warn';
    case 'expired':
      return 'bad';
    default:
      return 'neutral';
  }
}

/** Tailwind classes for the status dot (filled circle + soft glow ring). */
export const HEALTH_DOT: Record<HealthTone, string> = {
  ok: 'bg-green-600 shadow-[0_0_0_3px_var(--color-green-100)]',
  warn: 'bg-warning shadow-[0_0_0_3px_var(--color-warning-soft)]',
  bad: 'bg-danger shadow-[0_0_0_3px_var(--color-danger-soft)]',
  neutral: 'bg-ink-300 shadow-[0_0_0_3px_var(--color-ink-100)]',
};

/** Colour of the trailing value text, matching the dot tone. */
export const HEALTH_VALUE_TEXT: Record<HealthTone, string> = {
  ok: 'text-green-800',
  warn: 'text-warning-ink',
  bad: 'text-danger-ink',
  neutral: 'text-ink-500',
};

/**
 * Short status word for a health document — the card list shape only carries the
 * `*_status` enum (not the expiry date), so the dot colour does the heavy lifting.
 */
export function healthStatusLabel(status: string | null | undefined): string {
  switch (status as DogHealthStatus) {
    case 'valid':
      return 'Aktualne';
    case 'expiring_soon':
      return 'Wygasa wkrótce';
    case 'expired':
      return 'Przeterminowane';
    default:
      return 'Brak danych';
  }
}

/** Sex + sterilisation, as on the card ("suka, sterylizowana" / "pies, niewykastrowany"). */
export function describeDog(dog: { sex: string | null | undefined; is_sterilized: boolean }): string {
  if (dog.sex === 'female') {
    return dog.is_sterilized ? 'suka, sterylizowana' : 'suka, niesterylizowana';
  }
  if (dog.sex === 'male') {
    return dog.is_sterilized ? 'pies, kastrowany' : 'pies, niewykastrowany';
  }
  return dog.is_sterilized ? 'sterylizowany' : '';
}
