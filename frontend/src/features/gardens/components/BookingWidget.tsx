import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Lock, Minus, Plus } from 'lucide-react';
import { Button, Spinner, TimeRangePicker } from '@/shared/ui';
import type { TimeRange } from '@/shared/ui';
import { DatePicker } from '@/shared/ui/DatePicker';
import { useAuth } from '@/shared/auth';
import { formatPLN } from '@/shared/lib/money';
import { toISODate } from '@/shared/lib/dates';
import type { Garden } from '@/shared/api/types';
import { useAvailability } from '../api';
import { computeQuote, hoursBetween } from '../booking';

/** Sticky booking widget (Garden Detail.html `.booking`): date → hours → dogs → quote. */
export function BookingWidget({ garden }: { garden: Garden }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [range, setRange] = useState<TimeRange | null>(null);
  const [dogs, setDogs] = useState(1);

  const dateISO = date ? toISODate(date) : '';
  const availability = useAvailability(garden.id, dateISO);
  const slots = (availability.data?.slots ?? []).map((s) => ({ hour: s.hour, available: s.available }));

  const quote = useMemo(
    () => computeQuote(garden.price_per_hour, range ? hoursBetween(range.start, range.end) : 0),
    [garden.price_per_hour, range],
  );

  const ready = Boolean(date && range && quote.hours > 0);

  function reserve() {
    if (!isAuthenticated) {
      navigate(`/logowanie?next=${encodeURIComponent(`/ogrody/${garden.id}`)}`);
      return;
    }
    navigate(`/rezerwacja/${garden.id}`, {
      state: { date: dateISO, start: range?.start, end: range?.end, dogs },
    });
  }

  return (
    <div className="rounded-lg border border-ink-100 bg-surface p-5 shadow-2">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <span className="text-2xl font-bold tracking-tight">{formatPLN(garden.price_per_hour)}</span>
          <span className="ml-1 text-[13px] text-ink-500">za godzinę</span>
        </div>
        {garden.rating_avg != null && (
          <span className="text-[13px] text-ink-500">
            ★ {garden.rating_avg.toFixed(2).replace('.', ',')} · {garden.rating_count}
          </span>
        )}
      </div>

      <div className="mb-3">
        <div className="mb-1.5 text-[13px] font-semibold text-ink-900">Data</div>
        <DatePicker selected={date} onSelect={setDate} disabled={{ before: new Date() }} className="w-full" />
      </div>

      <div className="mb-4">
        <div className="mb-1.5 text-[13px] font-semibold text-ink-900">Godziny</div>
        {!date ? (
          <p className="rounded-md bg-ink-50 px-3 py-2 text-[13px] text-ink-500">Najpierw wybierz datę.</p>
        ) : availability.isLoading ? (
          <div className="flex justify-center py-3 text-green-700">
            <Spinner size={20} />
          </div>
        ) : slots.length === 0 ? (
          <p className="rounded-md bg-ink-50 px-3 py-2 text-[13px] text-ink-500">Brak wolnych godzin w tym dniu.</p>
        ) : (
          <TimeRangePicker slots={slots} value={range} onChange={setRange} />
        )}
      </div>

      <div className="mb-4 flex items-center justify-between border-t border-ink-100 pt-4">
        <div>
          <div className="text-[13px] font-semibold text-ink-900">Psy</div>
          <div className="text-[12px] text-ink-500">maks. {garden.max_dogs}</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Mniej psów"
            disabled={dogs <= 1}
            onClick={() => setDogs((d) => Math.max(1, d - 1))}
            className="grid size-8 place-items-center rounded-full border border-ink-200 text-ink-700 disabled:opacity-40"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="w-5 text-center font-semibold">{dogs}</span>
          <button
            type="button"
            aria-label="Więcej psów"
            disabled={dogs >= garden.max_dogs}
            onClick={() => setDogs((d) => Math.min(garden.max_dogs, d + 1))}
            className="grid size-8 place-items-center rounded-full border border-ink-200 text-ink-700 disabled:opacity-40"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      {ready && (
        <div className="mb-4 flex flex-col gap-2 border-t border-ink-100 pt-4 text-sm">
          <div className="flex justify-between text-ink-700">
            <span>
              {quote.hours} godz. × {formatPLN(garden.price_per_hour)}
            </span>
            <span>{formatPLN(quote.subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink-700">
            <span>Opłata serwisowa</span>
            <span>{formatPLN(quote.serviceFee)}</span>
          </div>
          <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-bold">
            <span>Razem</span>
            <span>{formatPLN(quote.total)}</span>
          </div>
        </div>
      )}

      <Button fullWidth size="lg" disabled={!ready} onClick={reserve}>
        Zarezerwuj
      </Button>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-ink-500">
        <Lock className="size-3" />
        Płatność dopiero po potwierdzeniu rezerwacji
      </p>
    </div>
  );
}
