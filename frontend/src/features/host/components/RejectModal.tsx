import { useEffect, useState } from 'react';
import { Button, FormField, Modal, Textarea, useToast } from '@/shared/ui';
import { formatPLN } from '@/shared/lib/money';
import { getApiMessage } from '@/features/account/forms';
import type { ReservationListItem } from '@/shared/api/types';
import { useRejectReservation } from '../api';

export interface RejectModalProps {
  reservation: ReservationListItem | null;
  onClose: () => void;
}

/** Reject a pending reservation with an optional reason → full refund (PLAN AD-5). */
export function RejectModal({ reservation, onClose }: RejectModalProps) {
  const { toast } = useToast();
  const reject = useRejectReservation();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (reservation) setReason('');
  }, [reservation]);

  async function confirm() {
    if (!reservation) return;
    try {
      await reject.mutateAsync({ id: reservation.id, reason });
      toast({
        variant: 'success',
        title: 'Rezerwacja odrzucona',
        description: `Klient otrzyma pełny zwrot ${formatPLN(reservation.total_price)}.`,
      });
      onClose();
    } catch (error) {
      toast({ variant: 'error', title: 'Nie udało się odrzucić', description: getApiMessage(error) });
    }
  }

  return (
    <Modal
      open={reservation != null}
      onClose={onClose}
      title="Odrzucić rezerwację?"
      description={
        reservation ? `${reservation.client.full_name} · ${reservation.garden.title}` : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Wróć
          </Button>
          <Button variant="danger" loading={reject.isPending} onClick={confirm}>
            Odrzuć i zwróć płatność
          </Button>
        </>
      }
    >
      <FormField label="Powód (opcjonalnie)" htmlFor="reject-reason" hint="Trafi do klienta w e-mailu.">
        <Textarea
          id="reject-reason"
          rows={3}
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="np. Termin jest już zajęty na inne wydarzenie."
        />
      </FormField>
    </Modal>
  );
}
