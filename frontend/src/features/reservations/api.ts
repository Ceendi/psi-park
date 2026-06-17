import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type {
  CancelResult,
  Paginated,
  Reservation,
  ReservationListItem,
  ReservationStatusGroup,
} from '@/shared/api/types';

/**
 * Reservations data layer for the client panel (PLAN §8.2 `/reservations/`).
 * Lists are grouped by the `status_group` tab; cancel returns the refund outcome
 * (the 24h policy, AD-5). File downloads (invoice PDF, CSV export) are plain async
 * helpers — they stream a blob rather than feed React Query.
 */

export const reservationsKeys = {
  all: ['reservations'] as const,
  list: (group: ReservationStatusGroup, search: string) =>
    ['reservations', 'list', group, search] as const,
  detail: (id: number) => ['reservations', id] as const,
};

export function useReservations(group: ReservationStatusGroup, search = '') {
  return useQuery({
    queryKey: reservationsKeys.list(group, search),
    queryFn: async () => {
      const { data } = await api.get<Paginated<ReservationListItem>>('reservations/', {
        params: { status_group: group, search: search || undefined, page_size: 50 },
      });
      return data;
    },
  });
}

export function useReservation(id: number | null) {
  return useQuery({
    queryKey: id ? reservationsKeys.detail(id) : ['reservations', 'none'],
    queryFn: async () => {
      const { data } = await api.get<Reservation>(`reservations/${id}/`);
      return data;
    },
    enabled: id != null,
  });
}

export function useCancelReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<CancelResult>(`reservations/${id}/cancel/`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reservationsKeys.all });
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

/** Stream a blob response to a browser download. */
function saveBlob(data: Blob, filename: string): void {
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Download a reservation's invoice PDF (owner only; 404 when none exists yet). */
export async function downloadInvoice(reservationId: number): Promise<void> {
  const { data } = await api.get<Blob>(`reservations/${reservationId}/invoice/pdf/`, {
    responseType: 'blob',
  });
  saveBlob(data, `faktura-${reservationId}.pdf`);
}

/** Download the client's reservations as a CSV file. */
export async function exportReservationsCsv(): Promise<void> {
  const { data } = await api.get<Blob>('reservations/export.csv', { responseType: 'blob' });
  saveBlob(data, 'rezerwacje-psipark.csv');
}
