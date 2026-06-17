import type { BadgeVariant } from '@/shared/ui';
import type { UserRole, VerificationStatus } from '@/shared/api/types';

/** Garden verification status → PL label + badge tone (PLAN §10, FE owns PL). */
export const VERIFICATION_BADGE: Record<VerificationStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Oczekuje weryfikacji', variant: 'warning' },
  approved: { label: 'Zatwierdzony', variant: 'success' },
  rejected: { label: 'Odrzucony', variant: 'danger' },
};

export const ROLE_LABEL: Record<UserRole, string> = {
  client: 'Klient',
  host: 'Gospodarz',
  admin: 'Administrator',
};
