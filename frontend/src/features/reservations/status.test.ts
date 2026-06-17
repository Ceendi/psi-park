import { describe, it, expect } from 'vitest';
import { reservationBadge, STATUS_LABEL, STATUS_VARIANT } from './status';

describe('reservationBadge', () => {
  it('uses the status label + tone for non-completed groups', () => {
    expect(reservationBadge('confirmed', 'upcoming')).toEqual({
      label: 'Potwierdzona',
      variant: 'success',
    });
    expect(reservationBadge('cancelled', 'cancelled')).toEqual({
      label: 'Anulowana',
      variant: 'danger',
    });
    expect(reservationBadge('awaiting_host', 'upcoming').variant).toBe('warning');
  });

  it('relabels past confirmed stays as "Zakończona" (neutral) in the completed tab', () => {
    expect(reservationBadge('confirmed', 'completed')).toEqual({
      label: 'Zakończona',
      variant: 'neutral',
    });
  });

  it('has a Polish label + tone for every status', () => {
    const statuses = ['pending_payment', 'awaiting_host', 'confirmed', 'rejected', 'cancelled'] as const;
    for (const s of statuses) {
      expect(STATUS_LABEL[s]).toBeTruthy();
      expect(STATUS_VARIANT[s]).toBeTruthy();
    }
  });
});
