import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ToastProvider } from '@/shared/ui';
import type { ReservationListItem } from '@/shared/api/types';
import { ReservationsPage } from './ReservationsPage';

function row(overrides: Partial<ReservationListItem>): ReservationListItem {
  return {
    id: 1,
    status: 'awaiting_host',
    status_display: 'Oczekuje',
    garden: { id: 3, title: 'Ogród z basenem', city: 'Kraków', price_per_hour: '45.00', cover_image: null },
    dog: { id: 1, name: 'Łata', breed: 'Mieszaniec' },
    client: { id: 9, full_name: 'Katarzyna Nowak' },
    dogs_count: 1,
    start_time: '2026-05-24T15:00:00+02:00',
    end_time: '2026-05-24T17:00:00+02:00',
    total_price: '90.00',
    created_at: '2026-05-01T10:00:00+02:00',
    can_cancel: false,
    can_pay: false,
    can_accept: true,
    can_reject: true,
    refund_on_cancel: true,
    ...overrides,
  };
}

const pending = row({ id: 1, status: 'awaiting_host', can_accept: true });
const accepted = row({
  id: 2,
  status: 'confirmed',
  status_display: 'Zaakceptowana',
  client: { id: 8, full_name: 'Piotr Mazur' },
  can_accept: false,
  can_reject: false,
});

const mockAccept = vi.fn();
function listFor(group: string) {
  const results = group === 'all' ? [pending, accepted] : group === 'pending' ? [pending] : group === 'accepted' ? [accepted] : [];
  return { data: { count: results.length, results }, isLoading: false, isError: false, refetch: vi.fn() };
}

vi.mock('./api', () => ({
  useHostStats: () => ({ data: { pending_count: 1, upcoming_count: 1, completed_count: 0, total_earnings: '0', rating_avg: 4.9 } }),
  useHostReservations: (group: string) => listFor(group),
  useAcceptReservation: () => ({ mutate: mockAccept, isPending: false, variables: undefined }),
  useRejectReservation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReservationDetail: () => ({ data: undefined, isLoading: true }),
}));

function renderPage() {
  render(
    <ToastProvider>
      <MemoryRouter>
        <ReservationsPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => mockAccept.mockReset());

describe('host ReservationsPage', () => {
  it('shows accept/reject on a pending row and details on an accepted one', () => {
    renderPage();
    const pendingRow = screen.getByText('Katarzyna Nowak').closest('tr')!;
    expect(within(pendingRow).getByRole('button', { name: /Akceptuj/ })).toBeInTheDocument();
    expect(within(pendingRow).getByRole('button', { name: /Odrzuć/ })).toBeInTheDocument();

    const acceptedRow = screen.getByText('Piotr Mazur').closest('tr')!;
    expect(within(acceptedRow).getByRole('button', { name: 'Szczegóły' })).toBeInTheDocument();
  });

  it('accepts a reservation', async () => {
    renderPage();
    const pendingRow = screen.getByText('Katarzyna Nowak').closest('tr')!;
    await userEvent.click(within(pendingRow).getByRole('button', { name: /Akceptuj/ }));
    expect(mockAccept).toHaveBeenCalledWith(1, expect.anything());
  });

  it('filters to the pending tab', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: /Oczekuje/ }));
    expect(screen.getByText('Katarzyna Nowak')).toBeInTheDocument();
    expect(screen.queryByText('Piotr Mazur')).not.toBeInTheDocument();
  });
});
