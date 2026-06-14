import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ToastProvider } from '@/shared/ui';
import { PasswordResetPage } from './PasswordResetPage';

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockRequestAsync = vi.fn();
const mockConfirmAsync = vi.fn();
vi.mock('./api', () => ({
  useRequestPasswordReset: () => ({ mutateAsync: mockRequestAsync, isPending: false }),
  useConfirmPasswordReset: () => ({ mutateAsync: mockConfirmAsync, isPending: false }),
}));

function renderReset(path: string): void {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <PasswordResetPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockRequestAsync.mockReset();
  mockConfirmAsync.mockReset();
});

describe('PasswordResetPage — request mode', () => {
  it('requests a link and shows the "check your inbox" confirmation', async () => {
    mockRequestAsync.mockResolvedValue(undefined);
    renderReset('/reset-hasla');

    expect(screen.getByRole('heading', { name: /Zresetuj hasło/ })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('E-mail'), 'kasia@example.pl');
    await userEvent.click(screen.getByRole('button', { name: /Wyślij link/ }));

    await waitFor(() =>
      expect(mockRequestAsync).toHaveBeenCalledWith({ email: 'kasia@example.pl' }),
    );
    expect(await screen.findByRole('heading', { name: 'Sprawdź skrzynkę' })).toBeInTheDocument();
  });
});

describe('PasswordResetPage — confirm mode', () => {
  it('sets a new password from the uid+token query and redirects to login', async () => {
    mockConfirmAsync.mockResolvedValue(undefined);
    renderReset('/reset-hasla?uid=abc&token=xyz');

    expect(screen.getByRole('heading', { name: /Ustaw nowe hasło/ })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Nowe hasło'), 'Bezpieczne9');
    await userEvent.type(screen.getByLabelText('Powtórz nowe hasło'), 'Bezpieczne9');
    await userEvent.click(screen.getByRole('button', { name: /Zapisz nowe hasło/ }));

    await waitFor(() =>
      expect(mockConfirmAsync).toHaveBeenCalledWith({
        uid: 'abc',
        token: 'xyz',
        new_password: 'Bezpieczne9',
        new_password_confirm: 'Bezpieczne9',
      }),
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/logowanie', { replace: true }));
  });

  it('rejects mismatched passwords without calling the API', async () => {
    renderReset('/reset-hasla?uid=abc&token=xyz');
    await userEvent.type(screen.getByLabelText('Nowe hasło'), 'Bezpieczne9');
    await userEvent.type(screen.getByLabelText('Powtórz nowe hasło'), 'Inne12345');
    await userEvent.click(screen.getByRole('button', { name: /Zapisz nowe hasło/ }));

    expect(await screen.findByText('Hasła nie są takie same.')).toBeInTheDocument();
    expect(mockConfirmAsync).not.toHaveBeenCalled();
  });
});
