import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ToastProvider } from '@/shared/ui';
import type { User } from '@/shared/api/types';
import { SettingsPage } from './SettingsPage';

const user = {
  id: 9,
  email: 'kasia@example.pl',
  first_name: 'Katarzyna',
  last_name: 'Nowak',
  phone: '600100200',
  role: 'client',
  marketing_consent: false,
} as unknown as User;

const refreshUser = vi.fn();
vi.mock('@/shared/auth', () => ({
  useAuth: () => ({ user, refreshUser, logout: vi.fn() }),
}));

const updateProfile = vi.fn();
const changePassword = vi.fn();
vi.mock('./api', () => ({
  useUpdateProfile: () => ({ mutateAsync: updateProfile, isPending: false }),
  useChangePassword: () => ({ mutateAsync: changePassword, isPending: false }),
  useDeleteAccount: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

function renderPage() {
  render(
    <ToastProvider>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  updateProfile.mockReset();
  changePassword.mockReset();
  refreshUser.mockReset();
  updateProfile.mockResolvedValue(user);
});

describe('SettingsPage', () => {
  it('pre-fills the profile form from the logged-in user', () => {
    renderPage();
    expect(screen.getByLabelText(/Imię/)).toHaveValue('Katarzyna');
    expect(screen.getByLabelText(/Nazwisko/)).toHaveValue('Nowak');
    expect(screen.getByText(/kasia@example.pl · Klient/)).toBeInTheDocument();
  });

  it('saves the profile and refreshes the auth user', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));
    await waitFor(() => expect(updateProfile).toHaveBeenCalled());
    await waitFor(() => expect(refreshUser).toHaveBeenCalled());
  });

  it('blocks a password change when the confirmation does not match', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/Obecne hasło/), 'oldpass1');
    await userEvent.type(screen.getByLabelText(/^Nowe hasło/), 'newpass123');
    await userEvent.type(screen.getByLabelText(/Powtórz nowe hasło/), 'different');
    await userEvent.click(screen.getByRole('button', { name: 'Zmień hasło' }));
    expect(await screen.findByText('Hasła nie są takie same.')).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });
});
