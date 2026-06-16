import { describe, it, expect } from 'vitest';
import { gardenStatusBadge, hostReservationBadge } from './status';

describe('gardenStatusBadge', () => {
  it('maps verification + active state to the host card badge', () => {
    expect(gardenStatusBadge({ verification_status: 'approved', is_active: true })).toEqual({
      label: 'Aktywny',
      variant: 'success',
    });
    expect(gardenStatusBadge({ verification_status: 'approved', is_active: false })).toEqual({
      label: 'Wstrzymany',
      variant: 'neutral',
    });
    expect(gardenStatusBadge({ verification_status: 'pending', is_active: true })).toEqual({
      label: 'Oczekuje weryfikacji',
      variant: 'warning',
    });
    expect(gardenStatusBadge({ verification_status: 'rejected', is_active: true })).toEqual({
      label: 'Odrzucony',
      variant: 'danger',
    });
  });
});

describe('hostReservationBadge', () => {
  it('labels each reservation status in Polish with a tone', () => {
    expect(hostReservationBadge('awaiting_host')).toEqual({ label: 'Oczekuje', variant: 'warning' });
    expect(hostReservationBadge('confirmed')).toEqual({ label: 'Zaakceptowana', variant: 'success' });
    expect(hostReservationBadge('rejected')).toEqual({ label: 'Odrzucona', variant: 'danger' });
    expect(hostReservationBadge('cancelled')).toEqual({ label: 'Anulowana', variant: 'danger' });
  });
});
