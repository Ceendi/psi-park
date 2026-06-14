import {
  Calendar,
  CalendarDays,
  HelpCircle,
  LayoutGrid,
  ListChecks,
  MessageSquare,
  PawPrint,
  Settings,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/shared/auth';
import { DashboardLayout } from './DashboardLayout';

const ICON = 'size-[18px]';

function useUserName(fallback: string): string {
  const { user } = useAuth();
  return user?.full_name?.trim() || user?.email || fallback;
}

/** Client dashboard sidebar (Client Panel.html). */
export function DashboardClientLayout() {
  const userName = useUserName('Klient');
  return (
    <DashboardLayout
      roleLabel="Klient"
      userName={userName}
      avatarTone="clay"
      sections={[
        {
          label: 'Konto',
          items: [
            { to: '/panel', label: 'Moje rezerwacje', icon: <Calendar className={ICON} />, end: true },
            { to: '/panel/pupile', label: 'Moi pupile', icon: <PawPrint className={ICON} /> },
            { to: '/panel/recenzje', label: 'Recenzje', icon: <Star className={ICON} /> },
            { to: '/panel/wiadomosci', label: 'Wiadomości', icon: <MessageSquare className={ICON} /> },
            { to: '/panel/ustawienia', label: 'Ustawienia konta', icon: <Settings className={ICON} /> },
          ],
        },
        {
          label: 'Pomoc',
          items: [{ to: '/pomoc', label: 'Centrum pomocy', icon: <HelpCircle className={ICON} /> }],
        },
      ]}
    />
  );
}

/** Host earnings widget — chrome from Host Panel.html; F6 wires real figures. */
function HostEarningsWidget() {
  return (
    <div className="relative mt-4 overflow-hidden rounded-md bg-gradient-to-br from-green-800 to-green-700 p-4 text-bone">
      <div className="absolute -right-8 -top-8 size-28 rounded-full bg-white/[0.06]" />
      <div className="relative font-mono text-[10px] uppercase tracking-wider opacity-85">
        Zarobki w tym miesiącu
      </div>
      <div className="relative my-1 text-2xl font-bold tracking-tight">— zł</div>
      <span className="relative inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 font-mono text-[11px]">
        Dane w panelu Zarobki
      </span>
    </div>
  );
}

/** Host dashboard sidebar (Host Panel.html). */
export function DashboardHostLayout() {
  const { user } = useAuth();
  const userName = useUserName('Gospodarz');
  const verified = Boolean(user?.is_verified_host);
  return (
    <DashboardLayout
      roleLabel={verified ? 'Super-Gospodarz' : 'Gospodarz'}
      userName={userName}
      avatarTone="clay"
      verified={verified}
      widget={<HostEarningsWidget />}
      sections={[
        {
          label: 'Zarządzanie',
          items: [
            { to: '/gospodarz', label: 'Moje ogrody', icon: <LayoutGrid className={ICON} />, end: true },
            { to: '/gospodarz/rezerwacje', label: 'Rezerwacje', icon: <Calendar className={ICON} /> },
            { to: '/gospodarz/harmonogram', label: 'Harmonogram', icon: <CalendarDays className={ICON} /> },
            { to: '/gospodarz/wiadomosci', label: 'Wiadomości', icon: <MessageSquare className={ICON} /> },
            { to: '/gospodarz/zarobki', label: 'Zarobki', icon: <Wallet className={ICON} /> },
          ],
        },
        {
          label: 'Ustawienia',
          items: [
            { to: '/gospodarz/ustawienia', label: 'Ustawienia konta', icon: <Settings className={ICON} /> },
            { to: '/pomoc', label: 'Centrum pomocy', icon: <HelpCircle className={ICON} /> },
          ],
        },
      ]}
    />
  );
}

/** Admin dashboard sidebar — kept deliberately simple (PLAN AD-12). */
export function DashboardAdminLayout() {
  const userName = useUserName('Administrator');
  return (
    <DashboardLayout
      roleLabel="Administrator"
      userName={userName}
      avatarTone="green"
      sections={[
        {
          label: 'Administracja',
          items: [
            { to: '/admin', label: 'Kolejka weryfikacji', icon: <ListChecks className={ICON} />, end: true },
            { to: '/admin/uzytkownicy', label: 'Użytkownicy', icon: <Users className={ICON} /> },
            { to: '/admin/recenzje', label: 'Moderacja recenzji', icon: <Star className={ICON} /> },
          ],
        },
      ]}
    />
  );
}
