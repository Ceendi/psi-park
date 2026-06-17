import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { Badge, EmptyState, Skeleton, StatCard, Table, WalletIcon } from '@/shared/ui';
import type { Column } from '@/shared/ui';
import { formatDate } from '@/shared/lib/dates';
import { formatPLN } from '@/shared/lib/money';
import type { ReservationListItem } from '@/shared/api/types';
import { useHostReservations, useHostStats } from './api';

/** Host panel — "Zarobki": balance + per-reservation transaction list (PLAN F6). */
export function EarningsPage() {
  const stats = useHostStats();
  const reservations = useHostReservations('all');

  const transactions = useMemo(
    () => (reservations.data?.results ?? []).filter((r) => r.status === 'confirmed'),
    [reservations.data],
  );

  const columns: Column<ReservationListItem>[] = [
    { key: 'date', header: 'Data', render: (r) => formatDate(r.start_time) },
    {
      key: 'garden',
      header: 'Ogród',
      render: (r) => (
        <div>
          <div className="font-semibold">{r.garden.title}</div>
          <div className="text-[11px] text-ink-500">{r.client.full_name}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (r.start_time < new Date().toISOString() ? <Badge variant="neutral">Rozliczona</Badge> : <Badge variant="success">Potwierdzona</Badge>),
    },
    {
      key: 'amount',
      header: 'Kwota brutto',
      align: 'right',
      render: (r) => <span className="font-bold">{formatPLN(r.total_price)}</span>,
    },
  ];

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[28px] font-bold tracking-tight">Zarobki</h1>
        <p className="mt-1.5 text-sm text-ink-500">Twoje przychody z potwierdzonych rezerwacji (po prowizji serwisowej).</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-green-800 to-green-700 p-6 text-bone lg:col-span-1">
          <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/[0.06]" />
          <div className="relative font-mono text-[11px] uppercase tracking-wider opacity-85">
            Zarobki łącznie
          </div>
          {stats.isLoading ? (
            <Skeleton className="relative mt-2 h-9 w-32 bg-white/20" />
          ) : (
            <div className="relative my-1 text-3xl font-bold tracking-tight">
              {formatPLN(stats.data?.total_earnings ?? 0)}
            </div>
          )}
          <span className="relative inline-flex items-center gap-1 rounded-pill bg-white/15 px-2.5 py-1 font-mono text-[11px]">
            <TrendingUp className="size-3" />
            Po odjęciu prowizji platformy
          </span>
        </div>
        <StatCard
          icon={<WalletIcon size={18} />}
          value={stats.data?.completed_count ?? '—'}
          label="Zakończone pobyty"
        />
        <StatCard
          icon={<WalletIcon size={18} />}
          value={stats.data?.upcoming_count ?? '—'}
          label="Nadchodzące potwierdzone"
        />
      </div>

      <h2 className="mb-3 text-lg font-semibold tracking-tight">Transakcje</h2>
      {reservations.isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={<WalletIcon size={24} />}
          title="Brak transakcji"
          description="Potwierdzone rezerwacje pojawią się tutaj wraz z kwotami."
        />
      ) : (
        <Table columns={columns} data={transactions} rowKey={(r) => r.id} />
      )}
    </div>
  );
}
