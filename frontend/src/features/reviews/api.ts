import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { useAuth } from '@/shared/auth';
import type {
  EligibleReservation,
  GardenMini,
  Paginated,
  ReservationListItem,
  Review,
} from '@/shared/api/types';
import type { ReviewFormValues } from './validation';

/**
 * Reviews data layer (PLAN §8.2, F5). The panel reads two feeds:
 *  - `useEligibleReviews` — completed stays still awaiting a review (`/reviews/eligible/`);
 *  - `useMyReviews` — the client's *written* reviews.
 *
 * There is no list endpoint for one's own reviews, so `useMyReviews` reconstructs
 * them within the existing contract: completed reservations whose garden is no
 * longer "eligible" have been reviewed (one review per garden, K-1), and the review
 * itself is read from that garden's public review list, matched by author id.
 * (Documented in README → "Decyzje implementacyjne".)
 */

export interface MyReview {
  review: Review;
  garden: GardenMini;
}

export const reviewsKeys = {
  eligible: ['reviews', 'eligible'] as const,
  mine: (userId: number | undefined) => ['reviews', 'mine', userId] as const,
};

export function useEligibleReviews() {
  return useQuery({
    queryKey: reviewsKeys.eligible,
    queryFn: async () => {
      const { data } = await api.get<Paginated<EligibleReservation>>('reviews/eligible/', {
        params: { page_size: 100 },
      });
      return data.results;
    },
  });
}

export function useMyReviews() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: reviewsKeys.mine(userId),
    enabled: userId != null,
    queryFn: async () => {
      const [completed, eligible] = await Promise.all([
        api.get<Paginated<ReservationListItem>>('reservations/', {
          params: { status_group: 'completed', page_size: 100 },
        }),
        api.get<Paginated<EligibleReservation>>('reviews/eligible/', {
          params: { page_size: 100 },
        }),
      ]);

      const eligibleGardenIds = new Set(eligible.data.results.map((r) => r.garden.id));
      const reviewedGardens = new Map<number, GardenMini>();
      for (const reservation of completed.data.results) {
        if (!eligibleGardenIds.has(reservation.garden.id)) {
          reviewedGardens.set(reservation.garden.id, reservation.garden);
        }
      }

      const found: MyReview[] = [];
      await Promise.all(
        [...reviewedGardens].map(async ([gardenId, garden]) => {
          const { data } = await api.get<Paginated<Review>>(`gardens/${gardenId}/reviews/`, {
            params: { page_size: 100 },
          });
          const mine = data.results.find((rv) => rv.author.id === userId);
          if (mine) found.push({ review: mine, garden });
        }),
      );

      found.sort((a, b) => b.review.created_at.localeCompare(a.review.created_at));
      return found;
    },
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['reviews'] });
  // A new/removed review changes which completed stays are still reviewable.
  qc.invalidateQueries({ queryKey: ['reservations'] });
  qc.invalidateQueries({ queryKey: ['gardens'] });
}

/** Create a review for a completed reservation (`POST /reservations/{id}/review/`). */
export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reservationId,
      values,
    }: {
      reservationId: number;
      values: ReviewFormValues;
    }) => {
      const { data } = await api.post<Review>(`reservations/${reservationId}/review/`, values);
      return data;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: number; values: ReviewFormValues }) => {
      const { data } = await api.patch<Review>(`reviews/${id}/`, values);
      return data;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`reviews/${id}/`);
    },
    onSuccess: () => invalidateAll(qc),
  });
}
