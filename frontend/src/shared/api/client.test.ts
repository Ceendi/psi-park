import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AxiosError } from 'axios';
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { api, setAuthFailureHandler } from './client';
import {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from '@/shared/auth/tokens';

// A custom adapter is responsible for honouring `validateStatus` itself (axios
// only auto-applies it inside the built-in xhr/http adapters). So mirror that:
// resolve on 2xx, reject with an AxiosError otherwise.
function makeResponse(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
): Promise<AxiosResponse> {
  const response: AxiosResponse = { data, status, statusText: '', headers: {}, config };
  if (status >= 200 && status < 300) {
    return Promise.resolve(response);
  }
  return Promise.reject(
    new AxiosError(`Request failed with status ${status}`, String(status), config, null, response),
  );
}

const realAdapter = api.defaults.adapter;

beforeEach(() => {
  clearTokens();
  setAuthFailureHandler(null);
});

afterEach(() => {
  api.defaults.adapter = realAdapter;
  setAuthFailureHandler(null);
  clearTokens();
});

describe('api JWT interceptor', () => {
  it('refreshes once on 401 and retries the original request with the new token', async () => {
    let refreshCalls = 0;
    const adapter: AxiosAdapter = async (config) => {
      const url = config.url ?? '';
      const auth = config.headers.get('Authorization');
      if (url.includes('auth/refresh/')) {
        refreshCalls += 1;
        return makeResponse(config, 200, { access: 'new-access', refresh: 'new-refresh' });
      }
      if (url.includes('me/')) {
        return auth === 'Bearer new-access'
          ? makeResponse(config, 200, { id: 1, email: 'kasia@example.pl' })
          : makeResponse(config, 401, { detail: 'Token wygasł.', code: 'token_not_valid' });
      }
      return makeResponse(config, 404, {});
    };
    api.defaults.adapter = adapter;
    setTokens({ access: 'old-access', refresh: 'old-refresh' });

    const res = await api.get('me/');

    expect(res.status).toBe(200);
    expect(refreshCalls).toBe(1);
    // Rotated tokens are persisted for subsequent requests.
    expect(getAccessToken()).toBe('new-access');
    expect(getRefreshToken()).toBe('new-refresh');
  });

  it('coalesces concurrent 401s into a single refresh', async () => {
    let refreshCalls = 0;
    const adapter: AxiosAdapter = async (config) => {
      const url = config.url ?? '';
      const auth = config.headers.get('Authorization');
      if (url.includes('auth/refresh/')) {
        refreshCalls += 1;
        return makeResponse(config, 200, { access: 'new-access', refresh: 'new-refresh' });
      }
      return auth === 'Bearer new-access'
        ? makeResponse(config, 200, { ok: true })
        : makeResponse(config, 401, { code: 'token_not_valid' });
    };
    api.defaults.adapter = adapter;
    setTokens({ access: 'old-access', refresh: 'old-refresh' });

    const [a, b] = await Promise.all([api.get('dogs/'), api.get('reservations/')]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(refreshCalls).toBe(1);
  });

  it('clears the session and notifies the app when the refresh itself fails', async () => {
    const adapter: AxiosAdapter = async (config) => {
      const url = config.url ?? '';
      if (url.includes('auth/refresh/')) {
        return makeResponse(config, 401, { detail: 'Refresh nieważny.', code: 'token_not_valid' });
      }
      return makeResponse(config, 401, { code: 'token_not_valid' });
    };
    api.defaults.adapter = adapter;
    const onFailure = vi.fn();
    setAuthFailureHandler(onFailure);
    setTokens({ access: 'old-access', refresh: 'stale-refresh' });

    await expect(api.get('me/')).rejects.toBeDefined();

    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(getRefreshToken()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('does not attempt a refresh for auth endpoints (e.g. bad login)', async () => {
    let refreshCalls = 0;
    const adapter: AxiosAdapter = async (config) => {
      const url = config.url ?? '';
      if (url.includes('auth/refresh/')) refreshCalls += 1;
      return makeResponse(config, 401, { detail: 'Nieprawidłowe dane.' });
    };
    api.defaults.adapter = adapter;

    await expect(api.post('auth/login/', {})).rejects.toBeDefined();
    expect(refreshCalls).toBe(0);
  });
});
