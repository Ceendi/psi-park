import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type { AxiosError } from 'axios';
import { MemoryRouter } from 'react-router';
import { ToastProvider } from '@/shared/ui';
import { LoginPage } from './LoginPage';

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockLoginAsync = vi.fn();
vi.mock('./api', () => ({
  useLogin: () => ({ mutateAsync: mockLoginAsync, isPending: false }),
}));

function makeError(status: number): AxiosError {
  return { isAxiosError: true, response: { status, data: {} } } as unknown as AxiosError;
}

function renderLogin(path = '/logowanie'): void {
  const wrapper = (ui: ReactNode) => (
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </ToastProvider>
  );
  render(wrapper(<LoginPage />));
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockLoginAsync.mockReset();
});

describe('LoginPage', () => {
  it('renders the heading and the e-mail/password fields', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: 'Cześć ponownie!' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText(/Hasło/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zapomniałeś hasła?' })).toHaveAttribute(
      'href',
      '/reset-hasla',
    );
  });

  it('blocks submission and shows Polish validation errors when empty', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /Zaloguj się/ }));
    expect(await screen.findByText('Podaj adres e-mail.')).toBeInTheDocument();
    expect(screen.getByText('Podaj hasło.')).toBeInTheDocument();
    expect(mockLoginAsync).not.toHaveBeenCalled();
  });

  it('logs in and redirects by role, passing "remember me"', async () => {
    mockLoginAsync.mockResolvedValue({ role: 'client' });
    renderLogin();
    await userEvent.type(screen.getByLabelText('E-mail'), 'kasia@example.pl');
    await userEvent.type(screen.getByLabelText(/Hasło/), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /Zaloguj się/ }));

    await waitFor(() =>
      expect(mockLoginAsync).toHaveBeenCalledWith({
        email: 'kasia@example.pl',
        password: 'secret123',
        remember: true,
      }),
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/panel', { replace: true }));
  });

  it('honours a safe ?next= redirect target', async () => {
    mockLoginAsync.mockResolvedValue({ role: 'client' });
    renderLogin('/logowanie?next=%2Fpanel%2Fpupile');
    await userEvent.type(screen.getByLabelText('E-mail'), 'kasia@example.pl');
    await userEvent.type(screen.getByLabelText(/Hasło/), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /Zaloguj się/ }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/panel/pupile', { replace: true }),
    );
  });

  it('shows a Polish banner on bad credentials (401)', async () => {
    mockLoginAsync.mockRejectedValue(makeError(401));
    renderLogin();
    await userEvent.type(screen.getByLabelText('E-mail'), 'kasia@example.pl');
    await userEvent.type(screen.getByLabelText(/Hasło/), 'wrong-pass');
    await userEvent.click(screen.getByRole('button', { name: /Zaloguj się/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Nieprawidłowy e-mail lub hasło.');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
