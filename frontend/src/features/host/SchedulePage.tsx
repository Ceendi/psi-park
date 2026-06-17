import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Select, Skeleton } from '@/shared/ui';
import { toISODate } from '@/shared/lib/dates';
import type { ScheduleEvent } from '@/shared/api/types';
import { useHostGardens, useHostSchedule } from './api';
import { HostReservationDetailsModal } from './components/HostReservationDetailsModal';

const WEEKDAYS = ['pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nie'];

/** Host panel — "Harmonogram": month calendar of committed reservations (PLAN F6). */
export function SchedulePage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [gardenId, setGardenId] = useState<number | null>(null);
  const [detailsId, setDetailsId] = useState<number | null>(null);

  const gardens = useHostGardens();

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const schedule = useHostSchedule(toISODate(gridStart), toISODate(gridEnd), gardenId);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const event of schedule.data ?? []) {
      const key = toISODate(parseISO(event.start_time));
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [schedule.data]);

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Harmonogram</h1>
          <p className="mt-1.5 text-sm text-ink-500">Potwierdzone i oczekujące pobyty w Twoich ogrodach.</p>
        </div>
        <div className="w-full max-w-xs">
          <Select
            value={gardenId ?? ''}
            onChange={(e) => setGardenId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Wszystkie ogrody</option>
            {(gardens.data ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold capitalize">{format(month, 'LLLL yyyy', { locale: pl })}</div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setMonth(addMonths(month, -1))} aria-label="Poprzedni miesiąc">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>
            Dziś
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setMonth(addMonths(month, 1))} aria-label="Następny miesiąc">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {schedule.isError ? (
        <div className="rounded-lg border border-ink-100 bg-surface p-10 text-center">
          <p className="mb-3 text-sm text-ink-500">Nie udało się wczytać harmonogramu.</p>
          <Button onClick={() => schedule.refetch()}>Odśwież</Button>
        </div>
      ) : schedule.isLoading ? (
        <Skeleton className="h-[32rem] rounded-lg" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-ink-100 bg-surface">
          <div className="grid grid-cols-7 border-b border-ink-100 bg-ink-50">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-center font-mono text-[11px] uppercase tracking-wider text-ink-500">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = toISODate(day);
              const events = eventsByDay.get(key) ?? [];
              const inMonth = isSameMonth(day, month);
              const today = isSameDay(day, new Date());
              return (
                <div
                  key={key}
                  className={`min-h-24 border-b border-r border-ink-100 p-1.5 ${inMonth ? '' : 'bg-ink-50/40'}`}
                >
                  <div
                    className={`mb-1 inline-grid size-6 place-items-center rounded-full text-[12px] ${
                      today ? 'bg-green-700 font-semibold text-bone' : inMonth ? 'text-ink-700' : 'text-ink-300'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                  <div className="flex flex-col gap-1">
                    {events.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setDetailsId(event.id)}
                        className={`truncate rounded px-1.5 py-1 text-left text-[11px] transition hover:opacity-90 ${
                          event.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-warning-soft text-warning-ink'
                        }`}
                        title={`${event.garden_title} · ${event.dog_name} · ${event.client_name}`}
                      >
                        {format(parseISO(event.start_time), 'HH:mm')} {event.dog_name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-4 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded bg-green-100" /> Potwierdzona
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded bg-warning-soft" /> Oczekuje na decyzję
        </span>
      </div>

      <HostReservationDetailsModal reservationId={detailsId} onClose={() => setDetailsId(null)} />
    </div>
  );
}
