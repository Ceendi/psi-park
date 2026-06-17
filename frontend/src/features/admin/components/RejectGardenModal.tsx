import { useEffect, useState } from 'react';
import { Button, FormField, Modal, Textarea, useToast } from '@/shared/ui';
import type { AdminGarden } from '@/shared/api/types';
import { getApiMessage } from '../errors';
import { useRejectGarden } from '../api';

export interface RejectGardenModalProps {
  garden: AdminGarden | null;
  onClose: () => void;
}

/** Reject a garden with a required reason → e-mails the host (PLAN §8.2 / B9). */
export function RejectGardenModal({ garden, onClose }: RejectGardenModalProps) {
  const { toast } = useToast();
  const reject = useRejectGarden();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (garden) {
      setReason('');
      setError(null);
    }
  }, [garden]);

  async function confirm() {
    if (!garden) return;
    if (reason.trim() === '') {
      setError('Podaj powód odrzucenia — trafi do gospodarza.');
      return;
    }
    try {
      await reject.mutateAsync({ id: garden.id, reason: reason.trim() });
      toast({ variant: 'success', title: 'Ogród odrzucony', description: 'Gospodarz otrzyma powód e-mailem.' });
      onClose();
    } catch (err) {
      setError(getApiMessage(err, 'Nie udało się odrzucić ogrodu.'));
    }
  }

  return (
    <Modal
      open={garden != null}
      onClose={onClose}
      title="Odrzucić ofertę?"
      description={garden ? `„${garden.title}” · ${garden.city}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Anuluj
          </Button>
          <Button variant="danger" loading={reject.isPending} onClick={confirm}>
            Odrzuć ofertę
          </Button>
        </>
      }
    >
      <FormField
        label="Powód odrzucenia"
        htmlFor="garden-reject-reason"
        required
        error={error ?? undefined}
        hint="Np. zbyt mało zdjęć, niejasna lokalizacja, brakujące ogrodzenie."
      >
        <Textarea
          id="garden-reject-reason"
          rows={3}
          maxLength={300}
          value={reason}
          invalid={!!error}
          onChange={(e) => setReason(e.target.value)}
        />
      </FormField>
    </Modal>
  );
}
