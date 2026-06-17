import { Calendar, Clock, MapPin, PawPrint } from 'lucide-react';
import { formatPLN } from '@/shared/lib/money';
import { formatDate } from '@/shared/lib/dates';
import type { Garden } from '@/shared/api/types';
import { computeQuote, hoursBetween } from '@/features/gardens/booking';

export interface BookingSelection {
  date: string; // yyyy-MM-dd
  start: string; // HH:00
  end: string; // HH:00
  dogName?: string;
  dogsCount: number;
}

/** Sticky checkout summary (Booking Form.html / Payment.html) — garden + quote. */
export function OrderSummary({ garden, selection }: { garden: Garden; selection: BookingSelection }) {
  const hours = selection.start && selection.end ? hoursBetween(selection.start, selection.end) : 0;
  const quote = computeQuote(garden.price_per_hour, hours);

  return (
    <div className="rounded-lg border border-ink-100 bg-surface p-5 shadow-1">
      <div className="flex gap-3 border-b border-ink-100 pb-4">
        <div className="size-16 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-green-100 to-green-500">
          {garden.photos[0] && (
            <img src={garden.photos[0].thumbnail ?? garden.photos[0].image} alt="" className="size-full object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{garden.title}</div>
          <div className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-500">
            <MapPin className="size-3" />
            {garden.city}
          </div>
        </div>
      </div>

      <dl className="flex flex-col gap-2 border-b border-ink-100 py-4 text-[13px]">
        <div className="flex items-center gap-2 text-ink-700">
          <Calendar className="size-3.5 text-ink-500" />
          {selection.date ? formatDate(selection.date) : 'Wybierz datę'}
        </div>
        <div className="flex items-center gap-2 text-ink-700">
          <Clock className="size-3.5 text-ink-500" />
          {hours > 0 ? `${selection.start}–${selection.end} · ${hours} godz.` : 'Wybierz godziny'}
        </div>
        <div className="flex items-center gap-2 text-ink-700">
          <PawPrint className="size-3.5 text-ink-500" />
          {selection.dogName ?? 'Wybierz psa'}
          {selection.dogsCount > 1 ? ` +${selection.dogsCount - 1}` : ''}
        </div>
      </dl>

      <div className="flex flex-col gap-2 py-4 text-sm">
        <div className="flex justify-between text-ink-700">
          <span>
            {hours || 0} godz. × {formatPLN(garden.price_per_hour)}
          </span>
          <span>{formatPLN(quote.subtotal)}</span>
        </div>
        <div className="flex justify-between text-ink-700">
          <span>Opłata serwisowa</span>
          <span>{formatPLN(quote.serviceFee)}</span>
        </div>
      </div>

      <div className="flex justify-between border-t border-ink-100 pt-4 text-base font-bold">
        <span>Razem</span>
        <span>{formatPLN(quote.total)}</span>
      </div>
    </div>
  );
}
