import type { ReactNode } from 'react';
import { FileText, MapPin, RotateCcw } from 'lucide-react';
import { Badge, Button, CalendarIcon, ClockIcon, PawIcon } from '@/shared/ui';
import { formatDateShort, formatTime, hoursBetween } from '@/shared/lib/dates';
import { formatPLN } from '@/shared/lib/money';
import type { ReservationListItem, ReservationStatusGroup } from '@/shared/api/types';
import { reservationBadge } from '../status';

export interface ReservationCardProps {
  reservation: ReservationListItem;
  group: ReservationStatusGroup;
  canReview: boolean;
  onDetails: (reservation: ReservationListItem) => void;
  onCancel: (reservation: ReservationListItem) => void;
  onReview: (reservation: ReservationListItem) => void;
  onInvoice: (reservation: ReservationListItem) => void;
  onRebook: (gardenId: number) => void;
}

function Spec({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-[13px] text-ink-700">
      <span className="text-ink-500">{icon}</span>
      {children}
    </span>
  );
}

/** A reservation row (docs/design/project/Client Panel.html — `.res-card`). */
export function ReservationCard({
  reservation,
  group,
  canReview,
  onDetails,
  onCancel,
  onReview,
  onInvoice,
  onRebook,
}: ReservationCardProps) {
  const { garden, dog, start_time, end_time, total_price, status } = reservation;
  const badge = reservationBadge(status, group);
  const hours = Math.round(hoursBetween(start_time, end_time));
  const paid = status === 'confirmed' || status === 'awaiting_host' || group === 'completed';

  return (
    <article className="grid grid-cols-1 overflow-hidden rounded-lg border border-ink-100 bg-surface transition hover:shadow-2 md:grid-cols-[200px_minmax(0,1fr)_auto]">
      <div className="relative aspect-[4/3] bg-gradient-to-br from-green-100 to-green-500 md:aspect-auto">
        {garden.cover_image && (
          <img
            src={garden.cover_image}
            alt={garden.title}
            loading="lazy"
            className="size-full object-cover"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-col justify-center px-6 py-5">
        <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
          <h3 className="text-base font-semibold tracking-tight">{garden.title}</h3>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <div className="mb-3.5 flex items-center gap-1 text-[13px] text-ink-500">
          <MapPin className="size-3.5" />
          {garden.city}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Spec icon={<CalendarIcon size={15} />}>
            <strong className="font-semibold text-ink-900">{formatDateShort(start_time)}</strong>
          </Spec>
          <Spec icon={<ClockIcon size={15} />}>
            <strong className="font-semibold text-ink-900">
              {formatTime(start_time)}–{formatTime(end_time)}
            </strong>
            <span className="ml-1 text-ink-500">· {hours} godz.</span>
          </Spec>
          <Spec icon={<PawIcon size={15} />}>
            <strong className="font-semibold text-ink-900">{dog.name}</strong>
            {reservation.dogs_count > 1 && (
              <span className="ml-1 text-ink-500">+{reservation.dogs_count - 1}</span>
            )}
          </Spec>
        </div>
      </div>

      <div className="flex min-w-[220px] flex-col items-end justify-between gap-3.5 border-t border-ink-100 px-6 py-5 md:border-l md:border-t-0">
        <div className="text-right">
          <div
            className={
              status === 'cancelled' || status === 'rejected'
                ? 'text-xl font-bold tracking-tight text-ink-500 line-through'
                : 'text-xl font-bold tracking-tight'
            }
          >
            {formatPLN(total_price)}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-ink-500">REZ-{reservation.id}</div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => onDetails(reservation)}>
            Szczegóły
          </Button>
          {paid && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<FileText className="size-3.5" />}
              onClick={() => onInvoice(reservation)}
            >
              Faktura
            </Button>
          )}
          {reservation.can_cancel && (
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger-soft"
              onClick={() => onCancel(reservation)}
            >
              Anuluj
            </Button>
          )}
          {group === 'completed' && canReview && (
            <Button
              size="sm"
              leftIcon={<PawIcon size={14} />}
              onClick={() => onReview(reservation)}
            >
              Wystaw recenzję
            </Button>
          )}
          {group !== 'upcoming' && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RotateCcw className="size-3.5" />}
              onClick={() => onRebook(garden.id)}
            >
              Zarezerwuj ponownie
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
