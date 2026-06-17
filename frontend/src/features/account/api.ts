import { useMutation } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { User } from '@/shared/api/types';
import type { PasswordValues, ProfileValues } from './validation';

/**
 * Account (me) data layer (PLAN F5 — PATCH /me/, /me/password/, DELETE /me/).
 * Mutations are stateless here; the page refreshes `AuthContext` after a profile
 * change so the sidebar/avatar stay in sync.
 */

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (values: ProfileValues) => {
      const { data } = await api.patch<User>('me/', values);
      return data;
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (values: PasswordValues) => {
      await api.patch('me/password/', values);
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      await api.delete('me/');
    },
  });
}
