import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Calendar, Check, Download, Search, X } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  CalendarIcon,
  ClockIcon,
  Input,
  Skeleton,
  StarIcon,
  StatCard,
  Table,
  Tabs,
  useToast,
} from '@/shared/ui';
import type { Column } from '@/shared/ui';
import { formatDateShort, formatTime, hoursBetween } from '@/shared/lib/dates';
import { formatPLN } from '@/shared/lib/money';
import { getApiMessage } from '@/features/account/forms';
import type { HostReservationStatusGroup, ReservationListItem } from '@/shared/api/types';
import { useAcceptReservation, useHostReservations, useHostStats } from './api';
import { HOST_TABS, hostReservationBadge } from './status';
import { RejectModal } from './components/RejectModal';
import { HostReservationDetailsModal } from './components/HostReservationDetailsModal';

type Tab = HostReservationStatusGroup | 'all';

function buildCsv(rows: ReservationListItem[]): string {
  const header = ['Klient', 'Pies', 'Ogród', 'Start', 'Koniec', 'Kwota', 'Status'];
  const lines = rows.map((r) =>
    [r.client.full_name, r.dog.name, r.garden.title, r.start_time, r.end_time, r.total_price, r.status]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  );
  return `﻿${header.join(',')}\n${lines.join('\n')}`;
}

/** Host panel — "Rezerwacje" (docs/design/project/Host Panel.html, `#page-reservations`). */
export function ReservationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const stats = useHostStats();
  const accept = useAcceptReservation();

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ReservationListItem | null>(null);

  const all = useHostReservations('all');
  const pending = useHostReservations('pending');
  const accepted = useHostReservations('accepted');
  const cancelled = useHostReservations('cancelled');
  const queries: Record<Tab, typeof all> = { all, pending, accepted, cancelled, completed: all };
  const active = queries[tab];

  const counts: Record<string, number> = {
    all: all.data?.count ?? 0,
    pending: pending.data?.count ?? 0,
    accepted: accepted.data?.count ?? 0,
    cancelled: cancelled.data?.count ?? 0,
  };

  const visible = useMemo(() => {
    const rows = active.data?.results ?? [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      `${r.client.full_name} ${r.dog.name} ${r.garden.title}`.toLowerCase().includes(q),
    );
  }, [active.data, search]);

  function handleAccept(id: number) {
    accept.mutate(id, {
      onSuccess: () => toast({ variant: 'success', title: 'Rezerwacja zaakceptowana' }),
      onError: (error) =>
        toast({ variant: 'error', title: 'Nie udało się zaakceptować', description: getApiMessage(error) }),
    });
  }

  function handleCsv() {
    const csv = buildCsv(visible);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rezerwacje-gospodarz.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: Column<ReservationListItem>[] = [
    {
      key: 'client',
      header: 'Klient',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.client.full_name} size={36} tone="green" />
          <span className="font-semibold">{r.client.full_name}</span>
        </div>
      ),
    },
    {
      key: 'dog',
      header: 'Pies',
      render: (r) => (
        <div>
          <div className="font-semibold">{r.dog.name}</div>
          {r.dog.breed && <div className="text-[11px] text-ink-500">{r.dog.breed}</div>}
        </div>
      ),
    },
    {
      key: 'garden',
      header: 'Ogród',
      render: (r) => (
        <div>
          <div className="font-semibold">{r.garden.title}</div>
          <div className="text-[11px] text-ink-500">{r.garden.city}</div>
        </div>
      ),
    },
    {
      key: 'when',
      header: 'Data i godzina',
      render: (r) => (
        <div>
          <div className="font-semibold">{formatDateShort(r.start_time)}</div>
          <div className="font-mono text-[11px] text-ink-500">
            {formatTime(r.start_time)}–{formatTime(r.end_time)} · {Math.round(hoursBetween(r.start_time, r.end_time))} h
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Kwota',
      align: 'right',
      render: (r) => <span className="font-bold">{formatPLN(r.total_price)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const badge = hostReservationBadge(r.status);
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) =>
        r.can_accept ? (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              leftIcon={<Check className="size-3.5" />}
              loading={accept.isPending && accept.variables === r.id}
              onClick={() => handleAccept(r.id)}
            >
              Akceptuj
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<X className="size-3.5" />}
              onClick={() => setRejectTarget(r)}
            >
              Odrzuć
            </Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setDetailsId(r.id)}>
            Szczegóły
          </Button>
        ),
    },
  ];

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Rezerwacje</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {counts.pending > 0 ? (
              <>
                <strong>{counts.pending}</strong> prośb czeka na Twoją decyzję — odpowiedz w 24 godz.
              </>
            ) : (
              'Brak próśb oczekujących na decyzję.'
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="secondary" leftIcon={<Download className="size-3.5" />} onClick={handleCsv}>
            Eksport CSV
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Calendar className="size-3.5" />}
            onClick={() => navigate('/gospodarz/harmonogram')}
          >
            Otwórz harmonogram
          </Button>
        </div>
      </div>

      <div className="mb-7 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard
          icon={<ClockIcon size={18} />}
          value={stats.data?.pending_count ?? '—'}
          label="Czeka na decyzję"
        />
        <StatCard
          icon={<CalendarIcon size={18} />}
          value={stats.data?.upcoming_count ?? '—'}
          label="Nadchodzące potwierdzone"
        />
        <StatCard
          icon={<Check className="size-[18px]" />}
          value={stats.data?.completed_count ?? '—'}
          label="Zakończone pobyty"
        />
        <StatCard
          icon={<StarIcon size={18} />}
          value={stats.data?.rating_avg != null ? stats.data.rating_avg.toFixed(2).replace('.', ',') : '—'}
          label="Średnia ocena"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-ink-100 pb-4">
        <Tabs
          value={tab}
          onChange={(v) => {
            setSearch('');
            setTab(v as Tab);
          }}
          items={HOST_TABS.map((t) => ({ value: t.value, label: t.label, count: counts[t.value] }))}
        />
        <div className="w-full max-w-xs">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj klienta lub psa…"
            leadingIcon={<Search className="size-4" />}
          />
        </div>
      </div>

      {active.isLoading ? (
        <Skeleton className="h-72 rounded-lg" />
      ) : active.isError ? (
        <div className="rounded-lg border border-ink-100 bg-surface p-10 text-center">
          <p className="mb-3 text-sm text-ink-500">Nie udało się wczytać rezerwacji.</p>
          <Button onClick={() => active.refetch()}>Odśwież</Button>
        </div>
      ) : (
        <Table
          columns={columns}
          data={visible}
          rowKey={(r) => r.id}
          emptyMessage="Brak rezerwacji w tej kategorii."
          rowClassName={(r) => (r.status === 'awaiting_host' ? 'bg-warning-soft/30' : undefined)}
        />
      )}

      <RejectModal reservation={rejectTarget} onClose={() => setRejectTarget(null)} />
      <HostReservationDetailsModal reservationId={detailsId} onClose={() => setDetailsId(null)} />
    </div>
  );
}
