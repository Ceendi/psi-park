import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiError } from '@/shared/api/client';
import type { ApiErrorBody, UserRole } from '@/shared/api/types';

/**
 * Password strength scoring, ported 1:1 from the meter in
 * docs/design/project/Register.html so the UI stays pixel- and behaviour-faithful
 * to the Claude Design handoff (PLAN §16.1.1). Returns 0–4.
 */
export const STRENGTH_LABELS = ['—', 'Słabe', 'OK', 'Dobre', 'Mocne'] as const;

export function scorePassword(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^\w\s]/.test(password) && password.length >= 10) score += 1;
  return score;
}

/** Landing page after auth, by role (PLAN §16.2 route table). */
export function getRoleHome(role: UserRole): string {
  switch (role) {
    case 'host':
      return '/gospodarz';
    case 'admin':
      return '/admin';
    default:
      return '/panel';
  }
}

/**
 * Validate the `?next=` redirect target set by the auth guards (PLAN §16.2).
 * Only same-site absolute paths are honoured — blocks open-redirects to
 * `//evil.example` or `https://…`.
 */
export function getSafeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

function messageFrom(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const parts = value.filter((v): v is string => typeof v === 'string');
    return parts.length ? parts.join(' ') : null;
  }
  return null;
}

const GENERIC_FALLBACK = 'Coś poszło nie tak. Spróbuj ponownie.';

/**
 * Translate an API error (PLAN §6.3 shapes) into form feedback. Field-level DRF
 * errors (`{field: ["msg"]}`) are pushed onto the matching react-hook-form fields;
 * anything else (`detail`, `non_field_errors`, unknown fields, 401/429/network) is
 * returned as a single form-level message for a banner.
 *
 * @returns a form-level message to display, or `null` when every error mapped to a field.
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
  // Bad credentials / expired token: prefer the caller's friendly message over
  // the raw backend detail.
  if (status === 401) return fallback;

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
      // A field the form doesn't render (e.g. reset `token`) — surface it up top.
      formMessages.push(message);
    }
  }

  if (formMessages.length) return formMessages.join(' ');
  return mappedAField ? null : fallback;
}
