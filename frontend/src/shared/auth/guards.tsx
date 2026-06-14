import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import type { UserRole } from '@/shared/api/types';
import { useAuth } from './AuthContext';

function FullPageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-bone" role="status" aria-live="polite">
      <span className="size-8 animate-spin rounded-full border-[3px] border-ink-100 border-t-green-700" />
      <span className="sr-only">Ładowanie…</span>
    </div>
  );
}

function loginRedirect(pathname: string, search: string) {
  const next = encodeURIComponent(`${pathname}${search}`);
  return `/logowanie?next=${next}`;
}

/**
 * Gate for authenticated-only routes (PLAN §16.2). Usable as a layout route
 * (renders `<Outlet />`) or as a wrapper around `children`. Unauthenticated
 * users are sent to `/logowanie?next=…`.
 */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'unauthenticated') {
    return <Navigate to={loginRedirect(location.pathname, location.search)} replace />;
  }
  return <>{children ?? <Outlet />}</>;
}

/**
 * Gate for role-restricted routes (client / host / admin, PLAN §2.2). A logged-in
 * user with the wrong role is sent home; an anonymous user is sent to login.
 */
export function RequireRole({
  role,
  children,
}: {
  role: UserRole | UserRole[];
  children?: ReactNode;
}) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader />;
  if (!user) {
    return <Navigate to={loginRedirect(location.pathname, location.search)} replace />;
  }

  const allowed = Array.isArray(role) ? role.includes(user.role) : user.role === role;
  if (!allowed) return <Navigate to="/" replace />;

  return <>{children ?? <Outlet />}</>;
}
