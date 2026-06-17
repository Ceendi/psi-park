import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/shared/ui';
import type { AdminUser } from '@/shared/api/types';
import { UsersPage } from './UsersPage';

function user(overrides: Partial<AdminUser>): AdminUser {
  return {
    id: 1,
    email: 'a@psipark.pl',
    first_name: 'A',
    last_name: 'B',
    full_name: 'A B',
    phone: '600100200',
    role: 'client',
    is_active: true,
    is_verified_host: false,
    verified_at: null,
    marketing_consent: false,
    created_at: '2026-01-01T10:00:00+01:00',
    ...overrides,
  };
}

const host = user({ id: 1, full_name: 'Magda Host', role: 'host', is_verified_host: false });
const blocked = user({ id: 2, full_name: 'Jan Blocked', role: 'client', is_active: false });
const admin = user({ id: 3, full_name: 'Ola Admin', role: 'admin' });

const verifyMutate = vi.fn();
vi.mock('./api', () => ({
  useAdminUsers: () => ({ data: { count: 3, results: [host, blocked, admin] }, isLoading: false, isError: false }),
  useVerifyHost: () => ({ mutate: verifyMutate, isPending: false }),
  useBlockUser: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useUnblockUser: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderPage() {
  render(
    <ToastProvider>
      <UsersPage />
    </ToastProvider>,
  );
}

beforeEach(() => verifyMutate.mockReset());

describe('admin UsersPage', () => {
  it('offers verify + block for an unverified active host', async () => {
    renderPage();
    const row = screen.getByText('Magda Host').closest('tr')!;
    expect(within(row).getByRole('button', { name: 'Zweryfikuj' })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Zablokuj' })).toBeInTheDocument();
    await userEvent.click(within(row).getByRole('button', { name: 'Zweryfikuj' }));
    expect(verifyMutate).toHaveBeenCalledWith(1, expect.anything());
  });

  it('offers unblock for a blocked account', () => {
    renderPage();
    const row = screen.getByText('Jan Blocked').closest('tr')!;
    expect(within(row).getByRole('button', { name: 'Odblokuj' })).toBeInTheDocument();
  });

  it('never offers to block an admin', () => {
    renderPage();
    const row = screen.getByText('Ola Admin').closest('tr')!;
    expect(within(row).queryByRole('button', { name: 'Zablokuj' })).not.toBeInTheDocument();
  });
});
