import type { AuthTokens } from '@/shared/api/types';

/**
 * JWT token storage (PLAN AD-3, §11). Security trade-off for an SPA without a
 * session backend:
 *  - the **access** token lives only in memory (not readable via XSS-persisted
 *    storage),
 *  - the **refresh** token is persisted so the session survives a reload.
 *
 * "Zapamiętaj mnie na 30 dni" (Login screen, §16.1.1) toggles persistence:
 * `persistent` → `localStorage` (survives tab close), otherwise
 * `sessionStorage` (cleared with the tab).
 */

const REFRESH_KEY = 'psipark.refresh';

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

function safeGet(storage: Storage): string | null {
  try {
    return storage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

function safeRemove(storage: Storage): void {
  try {
    storage.removeItem(REFRESH_KEY);
  } catch {
    /* storage unavailable (private mode / SSR) — ignore */
  }
}

export function getRefreshToken(): string | null {
  return safeGet(localStorage) ?? safeGet(sessionStorage);
}

export function setRefreshToken(token: string | null, persistent = true): void {
  // Keep a single copy: clear both stores, then write to the chosen one.
  safeRemove(localStorage);
  safeRemove(sessionStorage);
  if (!token) return;
  const target = persistent ? localStorage : sessionStorage;
  try {
    target.setItem(REFRESH_KEY, token);
  } catch {
    /* ignore */
  }
}

/** Persist a fresh token pair (after login / register / refresh rotation). */
export function setTokens(tokens: Pick<AuthTokens, 'access' | 'refresh'>, persistent = true): void {
  setAccessToken(tokens.access);
  setRefreshToken(tokens.refresh, persistent);
}

export function clearTokens(): void {
  setAccessToken(null);
  setRefreshToken(null);
}

export function hasSession(): boolean {
  return getRefreshToken() !== null;
}
