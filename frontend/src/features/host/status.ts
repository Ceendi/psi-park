import type { BadgeVariant } from '@/shared/ui';
import type {
  Garden,
  HostReservationStatusGroup,
  ReservationStatus,
} from '@/shared/api/types';

/**
 * Garden status badge for the host's "Moje ogrody" cards
 * (docs/design/project/Host Panel.html — `.status.active/.pending-verification/…`).
 * Combines `verification_status` with `is_active` (a paused approved garden).
 */
export function gardenStatusBadge(
  garden: Pick<Garden, 'verification_status' | 'is_active'>,
): { label: string; variant: BadgeVariant } {
  if (garden.verification_status === 'pending') {
    return { label: 'Oczekuje weryfikacji', variant: 'warning' };
  }
  if (garden.verification_status === 'rejected') {
    return { label: 'Odrzucony', variant: 'danger' };
  }
  if (!garden.is_active) {
    return { label: 'Wstrzymany', variant: 'neutral' };
  }
  return { label: 'Aktywny', variant: 'success' };
}

/** Host reservation-row badge (PLAN §8.2). Enum values stay English. */
const HOST_RES_LABEL: Record<ReservationStatus, string> = {
  pending_payment: 'Oczekuje płatności',
  awaiting_host: 'Oczekuje',
  confirmed: 'Zaakceptowana',
  rejected: 'Odrzucona',
  cancelled: 'Anulowana',
};

const HOST_RES_VARIANT: Record<ReservationStatus, BadgeVariant> = {
  pending_payment: 'warning',
  awaiting_host: 'warning',
  confirmed: 'success',
  rejected: 'danger',
  cancelled: 'danger',
};

export function hostReservationBadge(status: ReservationStatus): {
  label: string;
  variant: BadgeVariant;
} {
  return { label: HOST_RES_LABEL[status], variant: HOST_RES_VARIANT[status] };
}

/** Host-panel tabs (design: Wszystkie / Oczekuje / Zaakceptowane / Odrzucone). */
export const HOST_TABS: { value: HostReservationStatusGroup | 'all'; label: string }[] = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'pending', label: 'Oczekuje' },
  { value: 'accepted', label: 'Zaakceptowane' },
  { value: 'cancelled', label: 'Odrzucone' },
];
