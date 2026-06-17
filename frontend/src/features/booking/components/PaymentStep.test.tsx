import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Reservation } from '@/shared/api/types';
import { PaymentStep } from './PaymentStep';

const mockConfirm = vi.fn();
vi.mock('@stripe/stripe-js', () => ({ loadStripe: () => Promise.resolve({}) }));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => ({ confirmPayment: mockConfirm }),
  useElements: () => ({}),
}));

const mockCreateIntent = vi.fn();
vi.mock('../api', () => ({
  useCreatePaymentIntent: () => ({ mutateAsync: mockCreateIntent, isPending: false }),
  useReservation: () => ({ data: { status: 'awaiting_host' } }),
}));

const reservation = { id: 1, total_price: '99.00' } as unknown as Reservation;

async function fillBilling() {
  await userEvent.type(screen.getByLabelText(/Imię i nazwisko/), 'Katarzyna Nowak');
  await userEvent.type(screen.getByLabelText(/E-mail/), 'kasia@example.pl');
  await userEvent.type(screen.getByLabelText(/Adres/), 'ul. Polna 1');
  await userEvent.type(screen.getByLabelText(/Kod pocztowy/), '30-001');
  await userEvent.type(screen.getByLabelText(/Miasto/), 'Kraków');
}

beforeEach(() => {
  mockConfirm.mockReset();
  mockCreateIntent.mockReset();
  mockCreateIntent.mockResolvedValue({ client_secret: 'cs_test', publishable_key: 'pk_test' });
  mockConfirm.mockResolvedValue({ error: undefined });
});

describe('PaymentStep', () => {
  it('creates a payment intent from billing then reveals the card form', async () => {
    render(<PaymentStep reservation={reservation} onPaid={vi.fn()} />);
    await fillBilling();
    await userEvent.click(screen.getByRole('button', { name: 'Przejdź do płatności kartą' }));

    await waitFor(() => expect(mockCreateIntent).toHaveBeenCalledWith({
      reservationId: 1,
      billing: expect.objectContaining({ billing_email: 'kasia@example.pl', billing_city: 'Kraków' }),
    }));
    expect(await screen.findByTestId('payment-element')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zapłać/ })).toBeInTheDocument();
  });

  it('confirms payment and calls onPaid once the reservation leaves pending_payment', async () => {
    const onPaid = vi.fn();
    render(<PaymentStep reservation={reservation} onPaid={onPaid} />);
    await fillBilling();
    await userEvent.click(screen.getByRole('button', { name: 'Przejdź do płatności kartą' }));
    await userEvent.click(await screen.findByRole('button', { name: /Zapłać/ }));

    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    await waitFor(() => expect(onPaid).toHaveBeenCalled());
  });
});
