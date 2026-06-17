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
import { NotFound } from './pages/NotFound';
import { PlaceholderPage } from './pages/PlaceholderPage';

// Public catalogue / home (F2) + garden detail (F3) — lazy.
const HomePage = lazy(() => import('@/features/gardens').then((m) => ({ default: m.HomePage })));
const GardenDetailPage = lazy(() =>
  import('@/features/gardens').then((m) => ({ default: m.GardenDetailPage })),
);

// Booking wizard + Stripe payment (F4) — client-only, lazy.
const BookingWizardPage = lazy(() =>
  import('@/features/booking').then((m) => ({ default: m.BookingWizardPage })),
);
const BookingSuccessPage = lazy(() =>
  import('@/features/booking').then((m) => ({ default: m.SuccessPage })),
);

// Auth screens (F1) — lazy per route; the top-level Suspense in AppProviders
// renders the fallback while the chunk loads.
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'));
const PasswordResetPage = lazy(() => import('@/features/auth/PasswordResetPage'));

// Client panel screens (F5) — lazy per route.
const ReservationsPage = lazy(() =>
  import('@/features/reservations').then((m) => ({ default: m.ReservationsPage })),
);
const PetsPage = lazy(() => import('@/features/dogs').then((m) => ({ default: m.PetsPage })));
const ReviewsPage = lazy(() =>
  import('@/features/reviews').then((m) => ({ default: m.ReviewsPage })),
);
const SettingsPage = lazy(() =>
  import('@/features/account').then((m) => ({ default: m.SettingsPage })),
);

// Placeholders keep every route navigable on the F0 skeleton; later parts swap
// in the real screens (the routing, layouts and guards stay).
const ph = (title: string, part: string) => <PlaceholderPage title={title} part={part} />;

const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'ogrody/:id', element: <GardenDetailPage /> },
      // Booking flow — public layout but client-only (PLAN §16.2).
      {
        element: <RequireRole role="client" />,
        children: [
          { path: 'rezerwacja/:gardenId', element: <BookingWizardPage /> },
          { path: 'rezerwacja/:id/sukces', element: <BookingSuccessPage /> },
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
          { index: true, element: <ReservationsPage /> },
          { path: 'pupile', element: <PetsPage /> },
          { path: 'recenzje', element: <ReviewsPage /> },
          { path: 'wiadomosci', element: ph('Wiadomości', 'F7') },
          { path: 'wiadomosci/:id', element: ph('Wiadomości', 'F7') },
          { path: 'ustawienia', element: <SettingsPage /> },
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
          { path: 'ustawienia', element: <SettingsPage /> },
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
