import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type {
  Garden,
  GardenListItem,
  GardenPhoto,
  HostReservationStatusGroup,
  HostStats,
  Paginated,
  Reservation,
  ReservationListItem,
  ScheduleEvent,
} from '@/shared/api/types';
import type { GardenFormValues } from './validation';

/**
 * Host data layer (PLAN §8.2 `/host/*`). Components never call axios directly.
 * `/host/gardens/` lists the light `GardenList` shape (no verification status), so
 * `useHostGardens` follows up with a detail fetch per garden to drive the status
 * badges and gallery counts (documented in README → "Decyzje implementacyjne").
 */

export const hostKeys = {
  gardens: ['host', 'gardens'] as const,
  garden: (id: number) => ['host', 'gardens', id] as const,
  reservations: (group: string, garden: number | null, search: string) =>
    ['host', 'reservations', group, garden, search] as const,
  stats: ['host', 'stats'] as const,
  schedule: (from: string, to: string, garden: number | null) =>
    ['host', 'schedule', from, to, garden] as const,
};

function toGardenPayload(values: GardenFormValues): Record<string, unknown> {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    city: values.city.trim(),
    address: values.address.trim(),
    latitude: values.latitude,
    longitude: values.longitude,
    area_m2: Number(values.area_m2),
    surface_type: values.surface_type,
    is_fenced: values.is_fenced,
    fence_height_m: values.fence_height_m ? values.fence_height_m.replace(',', '.') : null,
    max_dogs: Number(values.max_dogs),
    price_per_hour: values.price_per_hour.replace(',', '.'),
    open_from: values.open_from,
    open_to: values.open_to,
    min_booking_hours: Number(values.min_booking_hours),
    amenities: values.amenities,
    rules: values.rules.map((r) => r.trim()).filter(Boolean),
    is_active: values.is_active,
  };
}

/* ---------- Gardens ---------- */

export function useHostGardens() {
  return useQuery({
    queryKey: hostKeys.gardens,
    queryFn: async () => {
      const { data } = await api.get<Paginated<GardenListItem>>('host/gardens/', {
        params: { page_size: 100 },
      });
      return Promise.all(
        data.results.map((g) => api.get<Garden>(`host/gardens/${g.id}/`).then((r) => r.data)),
      );
    },
  });
}

export function useHostGarden(id: number | null) {
  return useQuery({
    queryKey: id ? hostKeys.garden(id) : ['host', 'gardens', 'none'],
    queryFn: async () => {
      const { data } = await api.get<Garden>(`host/gardens/${id}/`);
      return data;
    },
    enabled: id != null,
  });
}

export function useCreateGarden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: GardenFormValues) => {
      const { data } = await api.post<Garden>('host/gardens/', toGardenPayload(values));
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hostKeys.gardens }),
  });
}

export function useUpdateGarden(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: GardenFormValues) => {
      const { data } = await api.patch<Garden>(`host/gardens/${id}/`, toGardenPayload(values));
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hostKeys.gardens });
      qc.invalidateQueries({ queryKey: hostKeys.garden(id) });
    },
  });
}

export function useToggleGardenActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const { data } = await api.patch<Garden>(`host/gardens/${id}/`, { is_active: isActive });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hostKeys.gardens }),
  });
}

export function useDeleteGarden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`host/gardens/${id}/`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hostKeys.gardens }),
  });
}

export function useUploadGardenPhoto(gardenId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('image', file);
      const { data } = await api.post<GardenPhoto>(`host/gardens/${gardenId}/photos/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hostKeys.garden(gardenId) }),
  });
}

export function useDeleteGardenPhoto(gardenId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photoId: number) => {
      await api.delete(`host/gardens/${gardenId}/photos/${photoId}/`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hostKeys.garden(gardenId) }),
  });
}

export function useReorderGardenPhotos(gardenId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photoIds: number[]) => {
      const { data } = await api.patch<GardenPhoto[]>(`host/gardens/${gardenId}/photos/reorder/`, {
        photo_ids: photoIds,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hostKeys.garden(gardenId) }),
  });
}

/* ---------- Reservations ---------- */

export function useHostReservations(
  group: HostReservationStatusGroup | 'all',
  gardenId: number | null = null,
  search = '',
) {
  return useQuery({
    queryKey: hostKeys.reservations(group, gardenId, search),
    queryFn: async () => {
      const { data } = await api.get<Paginated<ReservationListItem>>('host/reservations/', {
        params: {
          status_group: group === 'all' ? undefined : group,
          garden: gardenId ?? undefined,
          search: search || undefined,
          page_size: 50,
        },
      });
      return data;
    },
  });
}

/** Detail for the host's "Szczegóły" modal — host is a participant of `/reservations/{id}/`. */
export function useReservationDetail(id: number | null) {
  return useQuery({
    queryKey: ['host', 'reservation', id],
    queryFn: async () => {
      const { data } = await api.get<Reservation>(`reservations/${id}/`);
      return data;
    },
    enabled: id != null,
  });
}

export function useAcceptReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<Reservation>(`host/reservations/${id}/accept/`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['host', 'reservations'] });
      qc.invalidateQueries({ queryKey: hostKeys.stats });
    },
  });
}

export function useRejectReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const { data } = await api.post<Reservation>(`host/reservations/${id}/reject/`, { reason });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['host', 'reservations'] });
      qc.invalidateQueries({ queryKey: hostKeys.stats });
    },
  });
}

/* ---------- Stats & schedule ---------- */

export function useHostStats() {
  return useQuery({
    queryKey: hostKeys.stats,
    queryFn: async () => {
      const { data } = await api.get<HostStats>('host/stats/');
      return data;
    },
  });
}

export function useHostSchedule(from: string, to: string, gardenId: number | null = null) {
  return useQuery({
    queryKey: hostKeys.schedule(from, to, gardenId),
    queryFn: async () => {
      const { data } = await api.get<ScheduleEvent[]>('host/schedule/', {
        params: { from, to, garden: gardenId ?? undefined },
      });
      return data;
    },
    enabled: Boolean(from && to),
  });
}
