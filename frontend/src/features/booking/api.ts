import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type {
  Billing,
  DogListItem,
  Invoice,
  Paginated,
  PaymentIntentResponse,
  Reservation,
  StripeConfig,
} from '@/shared/api/types';

/**
 * Booking checkout data layer (PLAN F4). Flow: create a `pending_payment`
 * reservation → start a Stripe PaymentIntent → confirm card on the client →
 * poll the reservation until the webhook flips it to `awaiting_host` (AD-4: the
 * webhook is the source of truth, never the frontend).
 */

export interface CreateReservationInput {
  garden: number;
  dog: number;
  start_time: string;
  end_time: string;
  dogs_count: number;
  message_to_host: string;
}

export function useCreateReservation() {
  return useMutation({
    mutationFn: async (input: CreateReservationInput) => {
      const { data } = await api.post<Reservation>('reservations/', input);
      return data;
    },
  });
}

export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: async ({ reservationId, billing }: { reservationId: number; billing: Billing }) => {
      const { data } = await api.post<PaymentIntentResponse>(
        `reservations/${reservationId}/payment-intent/`,
        billing,
      );
      return data;
    },
  });
}

/**
 * Poll a reservation while waiting for the payment webhook. `pollUntilPaid`
 * keeps a short interval until the status leaves `pending_payment`.
 */
export function useReservation(id: number | null, pollUntilPaid = false) {
  return useQuery({
    queryKey: ['booking', 'reservation', id],
    queryFn: async () => {
      const { data } = await api.get<Reservation>(`reservations/${id}/`);
      return data;
    },
    enabled: id != null,
    refetchInterval: (query) =>
      pollUntilPaid && query.state.data?.status === 'pending_payment' ? 2000 : false,
  });
}

export function useInvoice(reservationId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ['booking', 'invoice', reservationId],
    queryFn: async () => {
      const { data } = await api.get<Invoice>(`reservations/${reservationId}/invoice/`);
      return data;
    },
    enabled: enabled && reservationId != null,
    retry: false,
  });
}

export function useStripeConfig() {
  return useQuery({
    queryKey: ['payments', 'config'],
    queryFn: async () => {
      const { data } = await api.get<StripeConfig>('payments/config/');
      return data;
    },
    staleTime: Infinity,
  });
}

/* ---------- Client dogs (B2) — needed by the step-1 dog picker ---------- */

export function useClientDogs() {
  return useQuery({
    queryKey: ['booking', 'dogs'],
    queryFn: async () => {
      const { data } = await api.get<Paginated<DogListItem>>('dogs/', { params: { page_size: 100 } });
      return data.results;
    },
  });
}

export interface QuickDogInput {
  name: string;
  breed: string;
  vaccinations_valid_until: string;
}

export function useAddDog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: QuickDogInput) => {
      const { data } = await api.post<DogListItem>('dogs/', {
        name: input.name.trim(),
        breed: input.breed.trim(),
        vaccinations_valid_until: input.vaccinations_valid_until || null,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dogs'] });
      qc.invalidateQueries({ queryKey: ['booking', 'dogs'] });
    },
  });
}
