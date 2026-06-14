import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, setAuthFailureHandler } from '@/shared/api/client';
import type { AuthTokens, RegisterInput, User } from '@/shared/api/types';
import { clearTokens, getRefreshToken, hasSession, setTokens } from './tokens';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface LoginInput {
  email: string;
  password: string;
  /** "Zapamiętaj mnie na 30 dni" (PLAN §16.1.1) — persists the refresh token. */
  remember?: boolean;
}

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // If the JWT refresh ultimately fails, the api layer calls this to drop the
  // session so guards can bounce the user to the login screen.
  useEffect(() => {
    setAuthFailureHandler(() => {
      setUser(null);
      setStatus('unauthenticated');
    });
    return () => setAuthFailureHandler(null);
  }, []);

  // Silent bootstrap: with a stored refresh token, the interceptor transparently
  // mints a new access token while we load the profile.
  useEffect(() => {
    let active = true;
    if (!hasSession()) {
      setStatus('unauthenticated');
      return;
    }
    api
      .get<User>('me/')
      .then(({ data }) => {
        if (!active) return;
        setUser(data);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus('unauthenticated');
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async ({ email, password, remember = true }: LoginInput) => {
    const { data } = await api.post<AuthTokens>('auth/login/', { email, password });
    setTokens({ access: data.access, refresh: data.refresh }, remember);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const { data } = await api.post<AuthTokens>('auth/register/', input);
    setTokens({ access: data.access, refresh: data.refresh });
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    try {
      if (refresh) await api.post('auth/logout/', { refresh });
    } catch {
      // Best effort — clear the local session regardless of the server reply.
    }
    clearTokens();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get<User>('me/');
    setUser(data);
    setStatus('authenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, status, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>.');
  }
  return ctx;
}
