import { isApiError } from '@/shared/api/client';
import type { ApiErrorBody } from '@/shared/api/types';

/** Extract a single Polish message from an API error (PLAN §6.3) for toasts. */
export function getApiMessage(error: unknown, fallback = 'Coś poszło nie tak. Spróbuj ponownie.'): string {
  if (!isApiError(error)) return fallback;
  const status = error.response?.status;
  if (status === undefined) return 'Brak połączenia z serwerem. Spróbuj ponownie.';
  if (status === 429) return 'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.';
  const data = error.response?.data as ApiErrorBody | undefined;
  const detail = data?.detail;
  return typeof detail === 'string' && detail ? detail : fallback;
}
