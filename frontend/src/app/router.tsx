import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import type { RouteObject } from 'react-router';
import { RequireRole } from '@/shared/auth';
import { PublicLayout } from './layouts/PublicLayout';
import { AuthLayout } from './layouts/AuthLayout';
import {
  DashboardAdminLayout,
  DashboardClientLayout,
  DashboardHostLayout,
} from './layouts/dashboards';
import { HomePlaceholder } from './pages/HomePlaceholder';
import { NotFound } from './pages/NotFound';
import { PlaceholderPage } from './pages/PlaceholderPage';

// Auth screens (F1) — lazy per route; the top-level Suspense in AppProviders
// renders the fallback while the chunk loads.
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'));
const PasswordResetPage = lazy(() => import('@/features/auth/PasswordResetPage'));

// Placeholders keep every route navigable on the F0 skeleton; later parts swap
// in the real screens (the routing, layouts and guards stay).
const ph = (title: string, part: string) => <PlaceholderPage title={title} part={part} />;

const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePlaceholder /> },
      { path: 'ogrody/:id', element: ph('Szczegóły ogrodu', 'F3') },
      // Booking flow — public layout but client-only (PLAN §16.2).
      {
        element: <RequireRole role="client" />,
        children: [
          { path: 'rezerwacja/:gardenId', element: ph('Rezerwacja ogrodu', 'F4') },
          { path: 'rezerwacja/:id/sukces', element: ph('Rezerwacja potwierdzona', 'F4') },
        ],
      },
      // Static legal/help pages (F8).
      { path: 'regulamin', element: ph('Regulamin serwisu', 'F8') },
      { path: 'polityka-prywatnosci', element: ph('Polityka prywatności', 'F8') },
      { path: 'pomoc', element: ph('Centrum pomocy', 'F8') },
      { path: 'uslugi-elektroniczne', element: ph('Świadczenie usług drogą elektroniczną', 'F8') },
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: 'logowanie', element: <LoginPage /> },
      { path: 'rejestracja', element: <RegisterPage /> },
      // The reset e-mail links to `/reset-hasla?uid=…&token=…`; the `:token` path
      // form is kept per PLAN §16.2 and resolves to the same screen.
      { path: 'reset-hasla', element: <PasswordResetPage /> },
      { path: 'reset-hasla/:token', element: <PasswordResetPage /> },
    ],
  },
  {
    // Client dashboard.
    element: <RequireRole role="client" />,
    children: [
      {
        path: 'panel',
        element: <DashboardClientLayout />,
        children: [
          { index: true, element: ph('Moje rezerwacje', 'F5') },
          { path: 'pupile', element: ph('Moi pupile', 'F5') },
          { path: 'recenzje', element: ph('Moje recenzje', 'F5') },
          { path: 'wiadomosci', element: ph('Wiadomości', 'F7') },
          { path: 'wiadomosci/:id', element: ph('Wiadomości', 'F7') },
          { path: 'ustawienia', element: ph('Ustawienia konta', 'F5') },
        ],
      },
    ],
  },
  {
    // Host dashboard.
    element: <RequireRole role="host" />,
    children: [
      {
        path: 'gospodarz',
        element: <DashboardHostLayout />,
        children: [
          { index: true, element: ph('Moje ogrody', 'F6') },
          { path: 'ogrody/nowy', element: ph('Nowy ogród', 'F6') },
          { path: 'ogrody/:id/edycja', element: ph('Edycja ogrodu', 'F6') },
          { path: 'rezerwacje', element: ph('Rezerwacje', 'F6') },
          { path: 'harmonogram', element: ph('Harmonogram', 'F6') },
          { path: 'wiadomosci', element: ph('Wiadomości', 'F7') },
          { path: 'wiadomosci/:id', element: ph('Wiadomości', 'F7') },
          { path: 'zarobki', element: ph('Zarobki', 'F6') },
          { path: 'ustawienia', element: ph('Ustawienia konta', 'F5') },
        ],
      },
    ],
  },
  {
    // Admin dashboard.
    element: <RequireRole role="admin" />,
    children: [
      {
        path: 'admin',
        element: <DashboardAdminLayout />,
        children: [
          { index: true, element: ph('Kolejka weryfikacji', 'F8') },
          { path: 'uzytkownicy', element: ph('Użytkownicy', 'F8') },
          { path: 'recenzje', element: ph('Moderacja recenzji', 'F8') },
        ],
      },
    ],
  },
];

// Dev-only design-system showcase (PLAN F0 — "demo stroną /_ui (tylko dev)").
// Excluded from production builds via dead-code elimination.
if (import.meta.env.DEV) {
  const UiShowcase = lazy(() => import('./pages/UiShowcase'));
  routes.push({ path: '_ui', element: <UiShowcase /> });
}

export const router = createBrowserRouter(routes);
