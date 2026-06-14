import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { TokenRefresh } from './types';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from '@/shared/auth/tokens';

/**
 * Shared axios instance (PLAN §16.3). Talks to the relative `/api/v1` base so
 * the Vite proxy (dev) / reverse proxy (prod) routes it to Django.
 *
 * Interceptors:
 *  - request: attach `Authorization: Bearer <access>`;
 *  - response: on 401, run a *single* queued refresh and retry the original
 *    request(s); if the refresh fails, clear the session and notify the app.
 */
export const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Auth endpoints legitimately return 401 (bad credentials / expired refresh) —
// never try to "refresh" around them.
function isAuthEndpoint(url: string | undefined): boolean {
  return !!url && url.includes('auth/');
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Called when the refresh token is missing/invalid — wired by AuthProvider to
// force a logout + redirect. Kept as a setter so the api module has no import
// dependency on React/auth context.
let onAuthFailure: (() => void) | null = null;
export function setAuthFailureHandler(handler: (() => void) | null): void {
  onAuthFailure = handler;
}

// Single in-flight refresh shared by every request that hits a 401 at once.
let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error('no_refresh_token');
  // Reuse `api`; `isAuthEndpoint` keeps this call out of the retry path.
  const { data } = await api.post<TokenRefresh>('auth/refresh/', { refresh });
  setTokens({ access: data.access, refresh: data.refresh ?? refresh });
  return data.access;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (status !== 401 || !original || original._retry || isAuthEndpoint(original.url)) {
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      if (!refreshing) {
        refreshing = refreshAccessToken().finally(() => {
          refreshing = null;
        });
      }
      await refreshing;
      // The request interceptor re-attaches the new access token on retry.
      return await api(original);
    } catch (refreshError) {
      clearTokens();
      onAuthFailure?.();
      return Promise.reject(refreshError);
    }
  },
);

/** Narrow an unknown thrown value to an AxiosError for typed error handling. */
export function isApiError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}
