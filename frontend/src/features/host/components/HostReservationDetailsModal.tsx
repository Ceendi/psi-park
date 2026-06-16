import type { ReactNode } from 'react';
import { Badge, Modal, Spinner } from '@/shared/ui';
import { formatDate, formatTime } from '@/shared/lib/dates';
import { formatPLN } from '@/shared/lib/money';
import { hostReservationBadge } from '../status';
import { useReservationDetail } from '../api';

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-ink-500">{label}</span>
      <span className="text-right font-medium text-ink-900">{value}</span>
    </div>
  );
}

/** Host-side reservation breakdown incl. the client's message (PLAN F6 "Szczegóły"). */
export function HostReservationDetailsModal({
  reservationId,
  onClose,
}: {
  reservationId: number | null;
  onClose: () => void;
}) {
  const detail = useReservationDetail(reservationId);
  const r = detail.data;
  const badge = r ? hostReservationBadge(r.status) : null;

  return (
    <Modal open={reservationId != null} onClose={onClose} title="Szczegóły rezerwacji" size="md">
      {detail.isLoading || !r ? (
        <div className="grid place-items-center py-10 text-green-700">
          <Spinner size={28} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold tracking-tight">{r.client.full_name}</h3>
            {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
          </div>

          <div className="rounded-md border border-ink-100 px-4 py-2">
            <Row label="Ogród" value={r.garden.title} />
            <Row label="Pies" value={`${r.dog.name}${r.dogs_count > 1 ? ` (+${r.dogs_count - 1})` : ''}`} />
            <Row label="Data" value={formatDate(r.start_time)} />
            <Row label="Godziny" value={`${formatTime(r.start_time)}–${formatTime(r.end_time)}`} />
          </div>

          <div className="rounded-md border border-ink-100 px-4 py-2">
            <Row label="Wynajem (Twój przychód)" value={formatPLN(r.subtotal)} />
            <Row label="Prowizja serwisowa" value={formatPLN(r.service_fee)} />
            <div className="mt-1 flex items-center justify-between border-t border-ink-100 pt-2 text-base font-bold">
              <span>Klient zapłacił</span>
              <span>{formatPLN(r.total_price)}</span>
            </div>
          </div>

          {r.message_to_host && (
            <div>
              <div className="mb-1 text-[13px] font-semibold text-ink-900">Wiadomość od klienta</div>
              <p className="rounded-md bg-ink-50 px-3 py-2 text-sm text-ink-700">{r.message_to_host}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
