import { Link } from 'react-router';
import { Avatar, Button, Logo, SearchIcon } from '@/shared/ui';
import { useAuth } from '@/shared/auth';

const dashboardPath: Record<string, string> = {
  client: '/panel',
  host: '/gospodarz',
  admin: '/admin',
};

/** Public top navigation (Home Page.html): brand, central search pill, auth CTAs. */
export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-[color-mix(in_srgb,var(--color-bone)_92%,transparent)] backdrop-blur-[14px]">
      <nav className="mx-auto grid max-w-[1400px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-4 md:gap-8 md:px-8">
        <Link to="/" className="flex items-center gap-2.5 text-[19px] font-bold tracking-tight">
          <Logo size={36} />
          PsiPark
        </Link>

        {/* Search pill — visual placeholder; the real search lives in F2 (Home). */}
        <Link
          to="/#szukaj"
          onClick={() => {
            if (window.location.pathname === '/') {
              document.getElementById('szukaj')?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="hidden w-full max-w-[640px] grid-cols-[1fr_1fr_0.7fr_auto] items-center justify-self-center overflow-hidden rounded-pill border border-ink-200 bg-surface shadow-1 transition hover:shadow-2 lg:grid"
          aria-label="Szukaj ogrodów"
        >
          <span className="border-r border-ink-100 px-[18px] py-2">
            <span className="block text-[11px] font-semibold text-ink-900">Gdzie</span>
            <span className="block text-[13px] text-ink-500">Cała Polska</span>
          </span>
          <span className="border-r border-ink-100 px-[18px] py-2">
            <span className="block text-[11px] font-semibold text-ink-900">Kiedy</span>
            <span className="block text-[13px] text-ink-500">Dowolny dzień</span>
          </span>
          <span className="px-[18px] py-2">
            <span className="block text-[11px] font-semibold text-ink-900">Godziny</span>
            <span className="block text-[13px] text-ink-500">Elastyczne</span>
          </span>
          <span className="m-1 grid size-11 place-items-center rounded-full bg-green-700 text-bone">
            <SearchIcon size={18} />
          </span>
        </Link>

        <div className="flex items-center justify-end gap-1">
          {isAuthenticated && user ? (
            <>
              <Link
                to={dashboardPath[user.role] ?? '/'}
                className="rounded-pill px-4 py-2.5 text-sm font-medium transition hover:bg-green-50 hover:text-green-800"
              >
                Panel
              </Link>
              <Button variant="ghost" size="sm" onClick={() => void logout()}>
                Wyloguj się
              </Button>
              <Link to={`${dashboardPath[user.role] ?? '/'}`} aria-label="Twój profil">
                <Avatar name={user.full_name || user.email} size={36} />
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/rejestracja"
                className="hidden rounded-pill px-4 py-2.5 text-sm font-medium transition hover:bg-green-50 hover:text-green-800 sm:block"
              >
                Zostań gospodarzem
              </Link>
              <Link
                to="/logowanie"
                className="rounded-pill px-4 py-2.5 text-sm font-medium transition hover:bg-green-50 hover:text-green-800"
              >
                Zaloguj się
              </Link>
              <Link
                to="/rejestracja"
                className="rounded-pill bg-ink-900 px-[18px] py-2.5 text-sm font-semibold text-bone transition hover:bg-green-800"
              >
                Zarejestruj się
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
