import type { ReactNode } from 'react';
import { Badge, Modal, Spinner } from '@/shared/ui';
import { formatDate, formatTime } from '@/shared/lib/dates';
import { formatPLN } from '@/shared/lib/money';
import { STATUS_LABEL, STATUS_VARIANT } from '../status';
import { useReservation } from '../api';

export interface ReservationDetailsModalProps {
  reservationId: number | null;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-ink-500">{label}</span>
      <span className="text-right font-medium text-ink-900">{value}</span>
    </div>
  );
}

/** Read-only reservation breakdown (price snapshot, message, timestamps). */
export function ReservationDetailsModal({ reservationId, onClose }: ReservationDetailsModalProps) {
  const detail = useReservation(reservationId);
  const r = detail.data;

  return (
    <Modal open={reservationId != null} onClose={onClose} title="Szczegóły rezerwacji" size="md">
      {detail.isLoading || !r ? (
        <div className="grid place-items-center py-10 text-green-700">
          <Spinner size={28} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold tracking-tight">{r.garden.title}</h3>
            <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
          </div>

          <div className="rounded-md border border-ink-100 px-4 py-2">
            <Row label="Miasto" value={r.garden.city} />
            <Row label="Data" value={formatDate(r.start_time)} />
            <Row label="Godziny" value={`${formatTime(r.start_time)}–${formatTime(r.end_time)}`} />
            <Row label="Pies" value={`${r.dog.name}${r.dogs_count > 1 ? ` (+${r.dogs_count - 1})` : ''}`} />
          </div>

          <div className="rounded-md border border-ink-100 px-4 py-2">
            <Row
              label={`Wynajem (${formatPLN(r.price_per_hour_snapshot)}/h)`}
              value={formatPLN(r.subtotal)}
            />
            <Row label="Prowizja serwisowa" value={formatPLN(r.service_fee)} />
            <div className="mt-1 flex items-center justify-between border-t border-ink-100 pt-2 text-base font-bold">
              <span>Razem</span>
              <span>{formatPLN(r.total_price)}</span>
            </div>
          </div>

          {r.message_to_host && (
            <div>
              <div className="mb-1 text-[13px] font-semibold text-ink-900">Wiadomość dla gospodarza</div>
              <p className="rounded-md bg-ink-50 px-3 py-2 text-sm text-ink-700">{r.message_to_host}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
