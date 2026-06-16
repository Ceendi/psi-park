import type { BadgeVariant } from '@/shared/ui';
import type { ReservationStatus, ReservationStatusGroup } from '@/shared/api/types';

/**
 * Polish status labels + badge tones (PLAN §10 — the frontend owns the PL mapping).
 * Enum values stay English per the contract (PLAN §8 / StatusEnum).
 */
export const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending_payment: 'Oczekuje płatności',
  awaiting_host: 'Oczekuje na gospodarza',
  confirmed: 'Potwierdzona',
  rejected: 'Odrzucona',
  cancelled: 'Anulowana',
};

export const STATUS_VARIANT: Record<ReservationStatus, BadgeVariant> = {
  pending_payment: 'warning',
  awaiting_host: 'warning',
  confirmed: 'success',
  rejected: 'danger',
  cancelled: 'danger',
};

/**
 * The badge shown on a panel card. A past `confirmed` stay reads as "Zakończona"
 * (neutral) in the "Zakończone" tab, matching docs/design/project/Client Panel.html.
 */
export function reservationBadge(
  status: ReservationStatus,
  group: ReservationStatusGroup,
): { label: string; variant: BadgeVariant } {
  if (group === 'completed') {
    return { label: 'Zakończona', variant: 'neutral' };
  }
  return { label: STATUS_LABEL[status], variant: STATUS_VARIANT[status] };
}
