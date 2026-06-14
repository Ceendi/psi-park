import { useMutation } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { useAuth } from '@/shared/auth';
import type { LoginInput } from '@/shared/auth';
import type {
  PasswordResetConfirm,
  PasswordResetRequest,
  RegisterInput,
  User,
} from '@/shared/api/types';

/**
 * Auth mutations as React Query hooks (PLAN §16.0 — components never call axios
 * directly). Login/register delegate to `AuthContext` because they own the global
 * token + user state; the password-reset endpoints are stateless, so they hit the
 * shared `api` client here in the data layer.
 */

export function useLogin() {
  const { login } = useAuth();
  return useMutation<User, unknown, LoginInput>({ mutationFn: (input) => login(input) });
}

export function useRegister() {
  const { register } = useAuth();
  return useMutation<User, unknown, RegisterInput>({ mutationFn: (input) => register(input) });
}

export function useRequestPasswordReset() {
  return useMutation<void, unknown, PasswordResetRequest>({
    mutationFn: async (body) => {
      await api.post('auth/password/reset/', body);
    },
  });
}

export function useConfirmPasswordReset() {
  return useMutation<void, unknown, PasswordResetConfirm>({
    mutationFn: async (body) => {
      await api.post('auth/password/reset/confirm/', body);
    },
  });
}
