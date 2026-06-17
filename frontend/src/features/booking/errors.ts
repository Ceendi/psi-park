import { isApiError } from '@/shared/api/client';
import type { ApiErrorBody } from '@/shared/api/types';

/** Map the business error `code`s relevant to checkout (PLAN §6.3) to PL messages. */
const CODE_MESSAGES: Record<string, string> = {
  slot_unavailable: 'Ten termin został właśnie zajęty. Wybierz inne godziny.',
  reservation_expired: 'Czas na opłacenie minął. Rozpocznij rezerwację ponownie.',
  dog_vaccination_required: 'Szczepienia psa muszą być ważne w dniu wizyty.',
  payment_already_processed: 'Ta rezerwacja została już opłacona.',
  reservation_state_invalid: 'Nie można teraz wykonać tej operacji.',
};

/** Extract a Polish message from an API error, preferring the business `code`. */
export function getApiMessage(error: unknown, fallback = 'Coś poszło nie tak. Spróbuj ponownie.'): string {
  if (!isApiError(error)) return fallback;
  const status = error.response?.status;
  if (status === undefined) return 'Brak połączenia z serwerem. Spróbuj ponownie.';
  const data = error.response?.data as ApiErrorBody | undefined;
  if (data?.code && CODE_MESSAGES[data.code]) return CODE_MESSAGES[data.code];
  if (typeof data?.detail === 'string' && data.detail) return data.detail;
  // First field error, if any.
  for (const value of Object.values(data ?? {})) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  }
  return fallback;
}
