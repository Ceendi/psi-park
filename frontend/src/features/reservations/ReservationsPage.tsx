import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Download, Search } from 'lucide-react';
import {
  Button,
  CalendarIcon,
  ClockIcon,
  EmptyState,
  Input,
  Skeleton,
  StarIcon,
  StatCard,
  Tabs,
  useToast,
  WalletIcon,
} from '@/shared/ui';
import { useAuth } from '@/shared/auth';
import { formatPLN } from '@/shared/lib/money';
import { hoursBetween } from '@/shared/lib/dates';
import type { ReservationListItem, ReservationStatusGroup } from '@/shared/api/types';
import { useEligibleReviews } from '@/features/reviews/api';
import { ReviewFormModal } from '@/features/reviews/components/ReviewFormModal';
import { downloadInvoice, exportReservationsCsv, useReservations } from './api';
import { ReservationCard } from './components/ReservationCard';
import { CancelModal } from './components/CancelModal';
import { ReservationDetailsModal } from './components/ReservationDetailsModal';
import { getApiMessage } from '@/features/account/forms';

const GROUPS: { value: ReservationStatusGroup; label: string }[] = [
  { value: 'upcoming', label: 'Nadchodzące' },
  { value: 'completed', label: 'Zakończone' },
  { value: 'cancelled', label: 'Anulowane' },
];

function matches(reservation: ReservationListItem, query: string): boolean {
  if (!query) return true;
  const haystack = `${reservation.garden.title} ${reservation.garden.city} ${reservation.dog.name}`;
  return haystack.toLowerCase().includes(query.toLowerCase());
}

/** Client panel — "Moje rezerwacje" (docs/design/project/Client Panel.html, `#page-reservations`). */
export function ReservationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [group, setGroup] = useState<ReservationStatusGroup>('upcoming');
  const [search, setSearch] = useState('');
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ReservationListItem | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ReservationListItem | null>(null);

  // One query per tab keeps the counts + stat tiles live without re-fetching on
  // every tab switch; the search box filters the active tab client-side.
  const upcoming = useReservations('upcoming');
  const completed = useReservations('completed');
  const cancelled = useReservations('cancelled');
  const eligible = useEligibleReviews();

  const queries: Record<ReservationStatusGroup, typeof upcoming> = {
    upcoming,
    completed,
    cancelled,
  };
  const active = queries[group];

  const eligibleIds = useMemo(
    () => new Set((eligible.data ?? []).map((r) => r.id)),
    [eligible.data],
  );

  const counts: Record<ReservationStatusGroup, number> = {
    upcoming: upcoming.data?.count ?? 0,
    completed: completed.data?.count ?? 0,
    cancelled: cancelled.data?.count ?? 0,
  };

  const stats = useMemo(() => {
    const completedRows = completed.data?.results ?? [];
    const hours = completedRows.reduce((acc, r) => acc + Math.round(hoursBetween(r.start_time, r.end_time)), 0);
    const spent = completedRows.reduce((acc, r) => acc + Number.parseFloat(r.total_price), 0);
    const completedGardens = new Set(completedRows.map((r) => r.garden.id));
    const eligibleGardens = new Set((eligible.data ?? []).map((r) => r.garden.id));
    const reviewsWritten = [...completedGardens].filter((id) => !eligibleGardens.has(id)).length;
    return {
      total: counts.upcoming + counts.completed + counts.cancelled,
      hours,
      reviewsWritten,
      spent,
    };
  }, [completed.data, eligible.data, counts.upcoming, counts.completed, counts.cancelled]);

  const visible = (active.data?.results ?? []).filter((r) => matches(r, search));

  async function handleInvoice(reservation: ReservationListItem) {
    try {
      await downloadInvoice(reservation.id);
    } catch (error) {
      toast({
        variant: 'error',
        title: 'Faktura niedostępna',
        description: getApiMessage(error, 'Faktura dla tej rezerwacji nie jest jeszcze gotowa.'),
      });
    }
  }

  async function handleCsv() {
    try {
      await exportReservationsCsv();
    } catch (error) {
      toast({ variant: 'error', title: 'Eksport nie powiódł się', description: getApiMessage(error) });
    }
  }

  let list;
  if (active.isLoading) {
    list = (
      <div className="flex flex-col gap-4">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-44 rounded-lg" />
        ))}
      </div>
    );
  } else if (active.isError) {
    list = (
      <EmptyState
        title="Nie udało się wczytać rezerwacji"
        description="Spróbuj ponownie za chwilę."
        action={<Button onClick={() => active.refetch()}>Odśwież</Button>}
      />
    );
  } else if (visible.length === 0) {
    list = (
      <EmptyState
        icon={<CalendarIcon size={24} />}
        title={search ? 'Brak wyników' : 'Brak rezerwacji w tej zakładce'}
        description={
          search
            ? 'Zmień frazę wyszukiwania.'
            : 'Zaplanuj kolejny pobyt z pupilem — w okolicy czekają wolne ogrody.'
        }
        action={
          !search && (
            <Button onClick={() => navigate('/')}>Znajdź ogród</Button>
          )
        }
      />
    );
  } else {
    list = (
      <div className="flex flex-col gap-4">
        {visible.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            group={group}
            canReview={eligibleIds.has(reservation.id)}
            onDetails={(r) => setDetailsId(r.id)}
            onCancel={setCancelTarget}
            onReview={setReviewTarget}
            onInvoice={handleInvoice}
            onRebook={(gardenId) => navigate(`/ogrody/${gardenId}`)}
          />
        ))}
      </div>
    );
  }

  const firstName = user?.first_name?.trim() || 'z powrotem';

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Moje rezerwacje</h1>
          <p className="mt-1.5 text-sm text-ink-500">Witaj z powrotem, {firstName} 👋</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="secondary" leftIcon={<Download className="size-3.5" />} onClick={handleCsv}>
            Eksport CSV
          </Button>
          <Button leftIcon={<Search className="size-3.5" />} onClick={() => navigate('/')}>
            Znajdź ogród
          </Button>
        </div>
      </div>

      <div className="mb-7 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard icon={<CalendarIcon size={18} />} value={stats.total} label="Wszystkich rezerwacji" />
        <StatCard icon={<ClockIcon size={18} />} value={`${stats.hours} h`} label="Spędzonego w ogrodach" />
        <StatCard icon={<StarIcon size={18} />} value={stats.reviewsWritten} label="Wystawionych recenzji" />
        <StatCard
          icon={<WalletIcon size={18} />}
          value={formatPLN(stats.spent, { decimals: 0 })}
          label="Wydane w ogrodach"
        />
      </div>

      <div className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-ink-100 pb-4">
        <Tabs
          value={group}
          onChange={(v) => {
            setSearch('');
            setGroup(v as ReservationStatusGroup);
          }}
          items={GROUPS.map((g) => ({ value: g.value, label: g.label, count: counts[g.value] }))}
        />
        <div className="w-full max-w-xs">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj rezerwacji…"
            leadingIcon={<Search className="size-4" />}
          />
        </div>
      </div>

      {list}

      <ReservationDetailsModal reservationId={detailsId} onClose={() => setDetailsId(null)} />
      <CancelModal reservation={cancelTarget} onClose={() => setCancelTarget(null)} />
      <ReviewFormModal
        open={reviewTarget != null}
        onClose={() => setReviewTarget(null)}
        reservationId={reviewTarget?.id}
        gardenTitle={reviewTarget?.garden.title}
      />
    </div>
  );
}
