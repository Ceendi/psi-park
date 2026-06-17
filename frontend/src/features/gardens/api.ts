import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { Availability, Garden, GardenListItem, Paginated, Review } from '@/shared/api/types';
import { toApiParams, type GardenFilters } from './filters';

/**
 * Public catalogue data layer (PLAN §8.2 `GET /gardens/`). The list is the only
 * read F2 needs; filters/sort/paging are all server-side. `keepPreviousData`
 * keeps the current results on screen while the next page/filter loads (no flash).
 */
export function useGardens(filters: GardenFilters) {
  const params = toApiParams(filters);
  return useQuery({
    queryKey: ['gardens', 'list', params],
    queryFn: async () => {
      const { data } = await api.get<Paginated<GardenListItem>>('gardens/', { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

/* ---------- Garden detail (F3) ---------- */

export function useGarden(id: number) {
  return useQuery({
    queryKey: ['gardens', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<Garden>(`gardens/${id}/`);
      return data;
    },
  });
}

/** Hourly slot map for one day (`GET /gardens/{id}/availability/?date=`, PLAN §8.3). */
export function useAvailability(gardenId: number, date: string) {
  return useQuery({
    queryKey: ['gardens', 'availability', gardenId, date],
    queryFn: async () => {
      const { data } = await api.get<Availability>(`gardens/${gardenId}/availability/`, {
        params: { date },
      });
      return data;
    },
    enabled: Boolean(date),
  });
}

export function useGardenReviews(gardenId: number, page: number) {
  return useQuery({
    queryKey: ['gardens', 'reviews', gardenId, page],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Review>>(`gardens/${gardenId}/reviews/`, {
        params: { page, page_size: 6 },
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

/** Start (or reuse) a conversation with a garden's host (`POST /conversations/`, B8). */
export function useStartConversation() {
  return useMutation({
    mutationFn: async (gardenId: number) => {
      const { data } = await api.post<{ id: number }>('conversations/', { garden: gardenId });
      return data;
    },
  });
}
