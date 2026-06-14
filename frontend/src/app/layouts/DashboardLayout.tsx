import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { LogOut, Menu, ShieldCheck } from 'lucide-react';
import { Avatar, Drawer, Logo } from '@/shared/ui';
import { useAuth } from '@/shared/auth';
import { cn } from '@/shared/lib/cn';

export interface DashboardNavItem {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: number | string;
  badgeTone?: 'default' | 'danger';
  /** Match the route exactly (for index routes like /panel). */
  end?: boolean;
}

export interface DashboardNavSection {
  label?: string;
  items: DashboardNavItem[];
}

export interface DashboardLayoutProps {
  sections: DashboardNavSection[];
  roleLabel: string;
  userName: string;
  avatarTone?: 'green' | 'clay';
  verified?: boolean;
  widget?: ReactNode;
}

function NavItem({ item, onNavigate }: { item: DashboardNavItem; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition',
          isActive
            ? 'bg-green-700 font-semibold text-bone'
            : 'text-ink-700 hover:bg-ink-50 hover:text-ink-900',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={cn('flex w-[18px]', isActive ? 'text-bone' : 'text-ink-500')}>
            {item.icon}
          </span>
          <span className="flex-1">{item.label}</span>
          {item.badge !== undefined && (
            <span
              className={cn(
                'rounded-pill px-2 py-0.5 font-mono text-[11px] font-semibold',
                item.badgeTone === 'danger'
                  ? 'bg-danger text-bone'
                  : isActive
                    ? 'bg-white/20 text-bone'
                    : 'bg-ink-100 text-ink-700',
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({
  sections,
  roleLabel,
  userName,
  avatarTone = 'clay',
  verified,
  widget,
  onNavigate,
}: DashboardLayoutProps & { onNavigate?: () => void }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    onNavigate?.();
    await logout();
    navigate('/');
  }

  return (
    <div className="flex h-full flex-col p-4">
      <Link
        to="/"
        className="mb-4 flex items-center gap-2.5 border-b border-ink-100 px-3 pb-4 text-lg font-bold tracking-tight"
      >
        <Logo size={32} />
        PsiPark
      </Link>

      <div className="mb-4 flex items-center gap-3 rounded-md bg-green-50 p-3">
        <Avatar name={userName} tone={avatarTone} size={44} />
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-sm font-semibold">
            <span className="truncate">{userName}</span>
            {verified && <ShieldCheck className="size-3.5 shrink-0 text-green-700" />}
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-green-800">
            <span className="size-1.5 rounded-full bg-green-600" />
            {roleLabel}
          </div>
        </div>
      </div>

      <nav className="flex flex-col">
        {sections.map((section, index) => (
          <div key={section.label ?? index} className={index > 0 ? 'mt-4' : undefined}>
            {section.label && (
              <div className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-300">
                {section.label}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <NavItem key={item.to} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {widget}

      <div className="flex-1" />

      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-danger transition hover:bg-danger-soft"
      >
        <LogOut className="size-[18px]" />
        Wyloguj się
      </button>
      <div className="px-3 pt-3 font-mono text-[11px] text-ink-300">PsiPark v1.0 · 2026</div>
    </div>
  );
}

/** Dashboard shell with a 280px sidebar that collapses to a drawer < 1024px. */
export function DashboardLayout(props: DashboardLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen overflow-y-auto border-r border-ink-100 bg-surface lg:block">
        <SidebarContent {...props} />
      </aside>

      <div className="flex items-center gap-3 border-b border-ink-100 bg-surface px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Otwórz menu"
          className="grid size-9 place-items-center rounded-md text-ink-700 transition hover:bg-ink-50"
        >
          <Menu className="size-5" />
        </button>
        <Link to="/" className="flex items-center gap-2 font-bold">
          <Logo size={28} />
          PsiPark
        </Link>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} width={280}>
        <SidebarContent {...props} onNavigate={() => setDrawerOpen(false)} />
      </Drawer>

      <main className="mx-auto w-full max-w-[1200px] px-5 py-8 md:px-10">
        <Outlet />
      </main>
    </div>
  );
}
