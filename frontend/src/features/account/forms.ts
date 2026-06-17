import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiError } from '@/shared/api/client';
import type { ApiErrorBody } from '@/shared/api/types';

/**
 * Shared form-error helpers for the client-panel forms (F5: dog profile, account
 * settings, review). Mirrors the auth feature's mapper (PLAN §6.3 error shapes)
 * but lives in the account feature so the F5 screens don't depend on F1.
 */

const GENERIC_FALLBACK = 'Coś poszło nie tak. Spróbuj ponownie.';

function messageFrom(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const parts = value.filter((v): v is string => typeof v === 'string');
    return parts.length ? parts.join(' ') : null;
  }
  return null;
}

/**
 * Push DRF field errors (`{field: ["msg"]}`) onto matching react-hook-form fields;
 * return any leftover (`detail`, `non_field_errors`, unknown fields, 401/429/network)
 * as a single banner message, or `null` when every error mapped onto a field.
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[],
  fallback: string = GENERIC_FALLBACK,
): string | null {
  if (!isApiError(error)) return fallback;

  const status = error.response?.status;
  if (status === undefined) {
    return 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.';
  }
  if (status === 429) {
    return 'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.';
  }

  const data = error.response?.data as ApiErrorBody | undefined;
  if (!data || typeof data !== 'object') return fallback;

  const known = knownFields as readonly string[];
  const formMessages: string[] = [];
  let mappedAField = false;

  for (const [key, value] of Object.entries(data)) {
    if (key === 'code') continue;
    const message = messageFrom(value);
    if (!message) continue;
    if (key === 'detail' || key === 'non_field_errors') {
      formMessages.push(message);
    } else if (known.includes(key)) {
      setError(key as Path<T>, { type: 'server', message });
      mappedAField = true;
    } else {
      formMessages.push(message);
    }
  }

  if (formMessages.length) return formMessages.join(' ');
  return mappedAField ? null : fallback;
}

/** Extract a single Polish message from any API error (for toasts). */
export function getApiMessage(error: unknown, fallback: string = GENERIC_FALLBACK): string {
  if (!isApiError(error)) return fallback;
  const status = error.response?.status;
  if (status === undefined) return 'Brak połączenia z serwerem. Spróbuj ponownie.';
  if (status === 429) return 'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.';
  const data = error.response?.data as ApiErrorBody | undefined;
  const detail = data?.detail;
  return typeof detail === 'string' && detail ? detail : fallback;
}
