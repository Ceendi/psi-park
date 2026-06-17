import { Button, Modal, useToast } from '@/shared/ui';
import { formatPLN } from '@/shared/lib/money';
import { getApiMessage } from '@/features/account/forms';
import type { ReservationListItem } from '@/shared/api/types';
import { useCancelReservation } from '../api';

export interface CancelModalProps {
  reservation: ReservationListItem | null;
  onClose: () => void;
}

/** Cancel confirmation with the 24h refund policy (PLAN AD-5). */
export function CancelModal({ reservation, onClose }: CancelModalProps) {
  const { toast } = useToast();
  const cancel = useCancelReservation();

  async function confirm() {
    if (!reservation) return;
    try {
      const result = await cancel.mutateAsync(reservation.id);
      toast({
        variant: 'success',
        title: 'Rezerwacja anulowana',
        description: result.refunded
          ? `Zwrot ${formatPLN(reservation.total_price)} został zainicjowany.`
          : 'Zgodnie z polityką 24h zwrot nie przysługuje.',
      });
      onClose();
    } catch (error) {
      toast({ variant: 'error', title: 'Nie udało się anulować', description: getApiMessage(error) });
    }
  }

  const willRefund = reservation?.refund_on_cancel ?? false;

  return (
    <Modal
      open={reservation != null}
      onClose={onClose}
      title="Anulować rezerwację?"
      description={reservation ? `${reservation.garden.title} · ${reservation.garden.city}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Wróć
          </Button>
          <Button variant="danger" loading={cancel.isPending} onClick={confirm}>
            Anuluj rezerwację
          </Button>
        </>
      }
    >
      <div
        className={
          willRefund
            ? 'rounded-md bg-green-50 px-4 py-3 text-sm text-green-800'
            : 'rounded-md bg-warning-soft px-4 py-3 text-sm text-warning-ink'
        }
      >
        {willRefund ? (
          <>
            Otrzymasz <strong>pełny zwrot</strong> ({reservation && formatPLN(reservation.total_price)}).
            Anulujesz z wyprzedzeniem ponad 24 godzin przed startem.
          </>
        ) : (
          <>
            Anulujesz <strong>mniej niż 24 godziny</strong> przed startem — zgodnie z regulaminem
            zwrot nie przysługuje.
          </>
        )}
      </div>
    </Modal>
  );
}
