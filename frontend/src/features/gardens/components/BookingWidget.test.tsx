import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { Garden } from '@/shared/api/types';
import { BookingWidget } from './BookingWidget';

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

let authed = true;
vi.mock('@/shared/auth', () => ({ useAuth: () => ({ isAuthenticated: authed }) }));

vi.mock('../api', () => ({
  useAvailability: () => ({
    data: {
      date: '2026-05-15',
      open_from: '08:00',
      open_to: '20:00',
      slots: [
        { hour: '15:00', available: true },
        { hour: '16:00', available: false },
        { hour: '17:00', available: true },
      ],
    },
    isLoading: false,
  }),
}));

const garden = {
  id: 1,
  title: 'Ogród z basenem',
  price_per_hour: '45.00',
  max_dogs: 3,
  rating_avg: 4.8,
  rating_count: 23,
} as unknown as Garden;

function renderWidget() {
  render(
    <MemoryRouter>
      <BookingWidget garden={garden} />
    </MemoryRouter>,
  );
}

async function pickDate() {
  // Calendar opens on the fixed month (2026-05); the 15th is in-month and future.
  await userEvent.click(screen.getByRole('button', { name: /15 maja/i }));
}

beforeEach(() => {
  mockNavigate.mockReset();
  authed = true;
  vi.setSystemTime(new Date('2026-05-10T12:00:00'));
});
afterEach(() => vi.useRealTimers());

describe('BookingWidget', () => {
  it('prompts for a date before showing hours', () => {
    renderWidget();
    expect(screen.getByText('Najpierw wybierz datę.')).toBeInTheDocument();
  });

  it('disables busy slots and shows a live quote', async () => {
    renderWidget();
    await pickDate();
    expect(screen.getByRole('button', { name: '16:00' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: '15:00' }));
    expect(screen.getByText(/1 godz\. × 45 zł/)).toBeInTheDocument();
    expect(screen.getByText('Razem')).toBeInTheDocument();
  });

  it('navigates an authenticated client to the booking wizard with context', async () => {
    renderWidget();
    await pickDate();
    await userEvent.click(screen.getByRole('button', { name: '15:00' }));
    await userEvent.click(screen.getByRole('button', { name: 'Zarezerwuj' }));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/rezerwacja/1',
      expect.objectContaining({ state: expect.objectContaining({ start: '15:00', end: '16:00', dogs: 1 }) }),
    );
  });

  it('redirects a guest to login with a next target', async () => {
    authed = false;
    renderWidget();
    await pickDate();
    await userEvent.click(screen.getByRole('button', { name: '15:00' }));
    await userEvent.click(screen.getByRole('button', { name: 'Zarezerwuj' }));
    expect(mockNavigate).toHaveBeenCalledWith('/logowanie?next=%2Fogrody%2F1');
  });
});
