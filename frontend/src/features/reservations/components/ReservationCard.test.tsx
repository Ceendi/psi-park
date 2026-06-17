import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReservationListItem } from '@/shared/api/types';
import { ReservationCard } from './ReservationCard';

function makeReservation(overrides: Partial<ReservationListItem> = {}): ReservationListItem {
  return {
    id: 42,
    status: 'confirmed',
    status_display: 'Potwierdzona',
    garden: { id: 3, title: 'Ogród z basenem', city: 'Kraków', price_per_hour: '45.00', cover_image: null },
    dog: { id: 1, name: 'Łata', breed: 'Mieszaniec' },
    client: { id: 9, full_name: 'Katarzyna Nowak' },
    dogs_count: 1,
    start_time: '2026-05-24T15:00:00+02:00',
    end_time: '2026-05-24T17:00:00+02:00',
    total_price: '89.00',
    created_at: '2026-05-01T10:00:00+02:00',
    can_cancel: true,
    can_pay: false,
    can_accept: false,
    can_reject: false,
    refund_on_cancel: true,
    ...overrides,
  };
}

const handlers = {
  onDetails: vi.fn(),
  onCancel: vi.fn(),
  onReview: vi.fn(),
  onInvoice: vi.fn(),
  onRebook: vi.fn(),
};

describe('ReservationCard', () => {
  it('renders an upcoming confirmed booking with cancel + invoice actions', () => {
    render(<ReservationCard reservation={makeReservation()} group="upcoming" canReview={false} {...handlers} />);
    expect(screen.getByRole('heading', { name: 'Ogród z basenem' })).toBeInTheDocument();
    expect(screen.getByText('Potwierdzona')).toBeInTheDocument();
    expect(screen.getByText('89 zł')).toBeInTheDocument();
    expect(screen.getByText(/15:00–17:00/)).toBeInTheDocument();
    expect(screen.getByText(/2 godz\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anuluj' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Faktura' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Wystaw recenzję/ })).not.toBeInTheDocument();
  });

  it('shows the review CTA for an eligible completed stay and relabels the badge', async () => {
    render(
      <ReservationCard
        reservation={makeReservation({ can_cancel: false })}
        group="completed"
        canReview
        {...handlers}
      />,
    );
    expect(screen.getByText('Zakończona')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Anuluj' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Wystaw recenzję/ }));
    expect(handlers.onReview).toHaveBeenCalled();
  });

  it('fires details + cancel callbacks', async () => {
    render(<ReservationCard reservation={makeReservation()} group="upcoming" canReview={false} {...handlers} />);
    await userEvent.click(screen.getByRole('button', { name: 'Szczegóły' }));
    expect(handlers.onDetails).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(handlers.onCancel).toHaveBeenCalled();
  });
});
