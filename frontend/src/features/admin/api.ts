import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type {
  AdminGarden,
  AdminReview,
  AdminUser,
  Paginated,
  UserRole,
  VerificationStatus,
} from '@/shared/api/types';

/**
 * Admin panel data layer (PLAN §8.2 `/admin/*`, AD-12). The garden queue returns
 * the full `AdminGarden` (photos, host contact, map coords) so the review card
 * needs no extra fetch. All actions go through `adminpanel.services` server-side.
 */

export const adminKeys = {
  gardens: (status: string, search: string) => ['admin', 'gardens', status, search] as const,
  users: (role: string, active: string, search: string) =>
    ['admin', 'users', role, active, search] as const,
  reviews: (garden: string, rating: string, search: string) =>
    ['admin', 'reviews', garden, rating, search] as const,
};

/* ---------- Garden verification queue ---------- */

export function useAdminGardens(status: VerificationStatus | 'all', search = '') {
  return useQuery({
    queryKey: adminKeys.gardens(status, search),
    queryFn: async () => {
      const { data } = await api.get<Paginated<AdminGarden>>('admin/gardens/', {
        params: { status: status === 'all' ? undefined : status, search: search || undefined, page_size: 50 },
      });
      return data;
    },
  });
}

export function useApproveGarden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<AdminGarden>(`admin/gardens/${id}/approve/`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'gardens'] }),
  });
}

export function useRejectGarden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const { data } = await api.post<AdminGarden>(`admin/gardens/${id}/reject/`, { reason });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'gardens'] }),
  });
}

/* ---------- Users ---------- */

export function useAdminUsers(role: UserRole | 'all', active: 'all' | 'active' | 'blocked', search = '') {
  return useQuery({
    queryKey: adminKeys.users(role, active, search),
    queryFn: async () => {
      const { data } = await api.get<Paginated<AdminUser>>('admin/users/', {
        params: {
          role: role === 'all' ? undefined : role,
          is_active: active === 'all' ? undefined : active === 'active',
          search: search || undefined,
          page_size: 50,
        },
      });
      return data;
    },
  });
}

function userAction(path: 'verify' | 'block' | 'unblock') {
  return async (id: number) => {
    const { data } = await api.post<AdminUser>(`admin/users/${id}/${path}/`);
    return data;
  };
}

export function useVerifyHost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: userAction('verify'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: userAction('block'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: userAction('unblock'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

/* ---------- Review moderation ---------- */

export function useAdminReviews(garden: string, rating: string, search = '') {
  return useQuery({
    queryKey: adminKeys.reviews(garden, rating, search),
    queryFn: async () => {
      const { data } = await api.get<Paginated<AdminReview>>('admin/reviews/', {
        params: {
          garden: garden || undefined,
          rating: rating || undefined,
          search: search || undefined,
          page_size: 50,
        },
      });
      return data;
    },
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`admin/reviews/${id}/`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reviews'] }),
  });
}
