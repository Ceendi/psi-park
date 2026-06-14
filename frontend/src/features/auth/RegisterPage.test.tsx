import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ToastProvider } from '@/shared/ui';
import { RegisterPage } from './RegisterPage';

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockRegisterAsync = vi.fn();
vi.mock('./api', () => ({
  useRegister: () => ({ mutateAsync: mockRegisterAsync, isPending: false }),
}));

function renderRegister(): void {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/rejestracja']}>
        <RegisterPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

const rodoCheckbox = () => screen.getByRole('checkbox', { name: /przetwarzanie moich danych/ });
const termsCheckbox = () => screen.getByRole('checkbox', { name: /Akceptuję/ });
const submitButton = () => screen.getByRole('button', { name: /Załóż konto/ });

beforeEach(() => {
  mockNavigate.mockReset();
  mockRegisterAsync.mockReset();
});

describe('RegisterPage', () => {
  it('renders the account-type toggle and a CTA disabled until consents are given', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: /Załóż konto/ })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Typ konta' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Klient/ })).toBeChecked();
    expect(submitButton()).toBeDisabled();
  });

  it('switches the account type to host', async () => {
    renderRegister();
    const host = screen.getByRole('radio', { name: /Gospodarz/ });
    await userEvent.click(host);
    expect(host).toBeChecked();
    expect(screen.getByRole('radio', { name: /Klient/ })).not.toBeChecked();
  });

  it('enables the CTA only once both required consents are checked', async () => {
    renderRegister();
    expect(submitButton()).toBeDisabled();
    await userEvent.click(rodoCheckbox());
    expect(submitButton()).toBeDisabled();
    await userEvent.click(termsCheckbox());
    expect(submitButton()).toBeEnabled();
  });

  it('reflects password strength as the user types', async () => {
    renderRegister();
    await userEvent.type(screen.getByLabelText('Hasło'), 'Abcdef1!gh');
    expect(screen.getByText('Mocne')).toBeInTheDocument();
  });

  it('validates required fields in Polish before calling the API', async () => {
    renderRegister();
    await userEvent.click(rodoCheckbox());
    await userEvent.click(termsCheckbox());
    await userEvent.click(submitButton());
    expect(await screen.findByText('Podaj imię.')).toBeInTheDocument();
    expect(screen.getByText('Podaj nazwisko.')).toBeInTheDocument();
    expect(mockRegisterAsync).not.toHaveBeenCalled();
  });

  it('registers a host and redirects, sending terms_accepted', async () => {
    mockRegisterAsync.mockResolvedValue({ role: 'host' });
    renderRegister();

    await userEvent.click(screen.getByRole('radio', { name: /Gospodarz/ }));
    await userEvent.type(screen.getByLabelText('Imię'), 'Magda');
    await userEvent.type(screen.getByLabelText('Nazwisko'), 'Krawczyk');
    await userEvent.type(screen.getByLabelText('E-mail'), 'magda@example.pl');
    await userEvent.type(screen.getByLabelText('Numer telefonu'), '+48 600 100 200');
    await userEvent.type(screen.getByLabelText('Hasło'), 'Bezpieczne9');
    await userEvent.type(screen.getByLabelText('Powtórz hasło'), 'Bezpieczne9');
    await userEvent.click(rodoCheckbox());
    await userEvent.click(termsCheckbox());
    await userEvent.click(submitButton());

    await waitFor(() =>
      expect(mockRegisterAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'host',
          email: 'magda@example.pl',
          first_name: 'Magda',
          last_name: 'Krawczyk',
          phone: '+48600100200',
          terms_accepted: true,
          marketing_consent: false,
        }),
      ),
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/gospodarz', { replace: true }));
  });
});
