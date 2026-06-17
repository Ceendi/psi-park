import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import {
  Button,
  EmptyState,
  Modal,
  Rating,
  Skeleton,
  StarIcon,
  Tabs,
  useToast,
} from '@/shared/ui';
import { formatDate, formatDateShort } from '@/shared/lib/dates';
import { getApiMessage } from '@/features/account/forms';
import type { EligibleReservation } from '@/shared/api/types';
import { useDeleteReview, useEligibleReviews, useMyReviews, type MyReview } from './api';
import { ReviewFormModal } from './components/ReviewFormModal';

type Tab = 'todo' | 'written';

function EligibleCard({ item, onReview }: { item: EligibleReservation; onReview: (item: EligibleReservation) => void }) {
  return (
    <article className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-ink-100 bg-surface p-5">
      <div>
        <h3 className="text-base font-semibold tracking-tight">{item.garden.title}</h3>
        <p className="mt-0.5 text-[13px] text-ink-500">
          {item.garden.city} · pobyt {formatDateShort(item.start_time)}
        </p>
      </div>
      <Button leftIcon={<StarIcon size={14} />} onClick={() => onReview(item)}>
        Wystaw recenzję
      </Button>
    </article>
  );
}

function WrittenCard({
  item,
  onEdit,
  onDelete,
}: {
  item: MyReview;
  onEdit: (item: MyReview) => void;
  onDelete: (item: MyReview) => void;
}) {
  return (
    <article className="rounded-lg border border-ink-100 bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">{item.garden.title}</h3>
          <div className="mt-1 flex items-center gap-3">
            <Rating value={item.review.rating} readOnly size={16} showValue />
            <span className="text-xs text-ink-500">{formatDate(item.review.created_at)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Pencil className="size-3.5" />} onClick={() => onEdit(item)}>
            Edytuj
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger-soft"
            leftIcon={<Trash2 className="size-3.5" />}
            onClick={() => onDelete(item)}
          >
            Usuń
          </Button>
        </div>
      </div>
      {item.review.comment && (
        <p className="mt-3 rounded-md bg-ink-50 px-3 py-2 text-sm text-ink-700">{item.review.comment}</p>
      )}
    </article>
  );
}

/** Client panel — "Recenzje": tabs "Do wystawienia" + "Wystawione" (PLAN F5). */
export function ReviewsPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('todo');
  const eligible = useEligibleReviews();
  const mine = useMyReviews();
  const deleteReview = useDeleteReview();

  const [reviewTarget, setReviewTarget] = useState<EligibleReservation | null>(null);
  const [editTarget, setEditTarget] = useState<MyReview | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MyReview | null>(null);

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteReview.mutateAsync(deleteTarget.review.id);
      toast({ variant: 'success', title: 'Recenzja usunięta' });
    } catch (error) {
      toast({ variant: 'error', title: 'Nie udało się usunąć', description: getApiMessage(error) });
    } finally {
      setDeleteTarget(null);
    }
  }

  const todoQuery = tab === 'todo' ? eligible : mine;

  let body;
  if (todoQuery.isLoading) {
    body = (
      <div className="flex flex-col gap-3">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  } else if (todoQuery.isError) {
    body = (
      <EmptyState
        title="Nie udało się wczytać recenzji"
        description="Spróbuj ponownie za chwilę."
        action={<Button onClick={() => todoQuery.refetch()}>Odśwież</Button>}
      />
    );
  } else if (tab === 'todo') {
    const rows = eligible.data ?? [];
    body =
      rows.length === 0 ? (
        <EmptyState
          icon={<StarIcon size={24} />}
          title="Wszystko ocenione"
          description="Nie masz pobytów oczekujących na recenzję. Po kolejnym pobycie wróć tutaj."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((item) => (
            <EligibleCard key={item.id} item={item} onReview={setReviewTarget} />
          ))}
        </div>
      );
  } else {
    const rows = mine.data ?? [];
    body =
      rows.length === 0 ? (
        <EmptyState
          icon={<StarIcon size={24} />}
          title="Brak wystawionych recenzji"
          description="Po zakończonym pobycie oceń ogród — Twoja opinia pomoże innym."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((item) => (
            <WrittenCard key={item.review.id} item={item} onEdit={setEditTarget} onDelete={setDeleteTarget} />
          ))}
        </div>
      );
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[28px] font-bold tracking-tight">Recenzje</h1>
        <p className="mt-1.5 text-sm text-ink-500">Oceń pobyty i zarządzaj swoimi opiniami.</p>
      </div>

      <div className="mb-7 border-b border-ink-100 pb-4">
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          items={[
            { value: 'todo', label: 'Do wystawienia', count: eligible.data?.length },
            { value: 'written', label: 'Wystawione', count: mine.data?.length },
          ]}
        />
      </div>

      {body}

      <ReviewFormModal
        open={reviewTarget != null}
        onClose={() => setReviewTarget(null)}
        reservationId={reviewTarget?.id}
        gardenTitle={reviewTarget?.garden.title}
      />
      <ReviewFormModal
        open={editTarget != null}
        onClose={() => setEditTarget(null)}
        gardenTitle={editTarget?.garden.title}
        review={
          editTarget
            ? {
                id: editTarget.review.id,
                rating: editTarget.review.rating,
                comment: editTarget.review.comment,
              }
            : undefined
        }
      />
      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="Usunąć recenzję?"
        description={deleteTarget ? `Twoja opinia o „${deleteTarget.garden.title}” zostanie usunięta.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Anuluj
            </Button>
            <Button variant="danger" loading={deleteReview.isPending} onClick={confirmDelete}>
              Usuń recenzję
            </Button>
          </>
        }
      />
    </div>
  );
}
