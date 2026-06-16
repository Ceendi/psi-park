import { useEffect, useState } from 'react';
import { Button, FormField, Modal, Rating, Textarea, useToast } from '@/shared/ui';
import { getApiMessage } from '@/features/account/forms';
import { useSubmitReview, useUpdateReview } from '../api';

export interface ReviewFormModalProps {
  open: boolean;
  onClose: () => void;
  gardenTitle?: string;
  /** Create mode: the completed reservation being reviewed. */
  reservationId?: number;
  /** Edit mode: the existing review to update. */
  review?: { id: number; rating: number; comment: string };
}

/** Rating + comment dialog for creating or editing a review (PLAN §8.2 → B7). */
export function ReviewFormModal({
  open,
  onClose,
  gardenTitle,
  reservationId,
  review,
}: ReviewFormModalProps) {
  const { toast } = useToast();
  const submit = useSubmitReview();
  const update = useUpdateReview();
  const editing = review != null;

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRating(review?.rating ?? 5);
    setComment(review?.comment ?? '');
    setError(null);
  }, [open, review]);

  const pending = submit.isPending || update.isPending;

  async function handleSubmit() {
    setError(null);
    if (rating < 1) {
      setError('Wybierz ocenę w gwiazdkach.');
      return;
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: review.id, values: { rating, comment } });
      } else if (reservationId != null) {
        await submit.mutateAsync({ reservationId, values: { rating, comment } });
      }
      toast({
        variant: 'success',
        title: editing ? 'Zaktualizowano recenzję' : 'Dziękujemy za recenzję',
      });
      onClose();
    } catch (err) {
      setError(getApiMessage(err, 'Nie udało się zapisać recenzji.'));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edytuj recenzję' : 'Oceń pobyt'}
      description={gardenTitle ? `Twoja opinia o: ${gardenTitle}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Anuluj
          </Button>
          <Button loading={pending} onClick={handleSubmit}>
            {editing ? 'Zapisz zmiany' : 'Wystaw recenzję'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-ink">
            {error}
          </p>
        )}
        <FormField label="Twoja ocena">
          <Rating value={rating} onChange={setRating} size={28} showValue />
        </FormField>
        <FormField label="Komentarz" htmlFor="review-comment" hint="Opcjonalnie — opisz swój pobyt.">
          <Textarea
            id="review-comment"
            rows={4}
            maxLength={2000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Jak wyglądał pobyt? Co było na plus?"
          />
        </FormField>
      </div>
    </Modal>
  );
}
