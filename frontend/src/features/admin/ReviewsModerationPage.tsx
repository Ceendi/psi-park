import { useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { Button, EmptyState, Input, Modal, Rating, Select, Skeleton, StarIcon, useToast } from '@/shared/ui';
import { formatDate } from '@/shared/lib/dates';
import type { AdminReview } from '@/shared/api/types';
import { getApiMessage } from './errors';
import { useAdminReviews, useDeleteReview } from './api';

/** Admin — review moderation: browse and remove violating reviews (PLAN F8). */
export function ReviewsModerationPage() {
  const { toast } = useToast();
  const [rating, setRating] = useState('');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminReview | null>(null);

  const reviews = useAdminReviews('', rating, search);
  const remove = useDeleteReview();

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.id);
      toast({ variant: 'success', title: 'Recenzja usunięta' });
    } catch (error) {
      toast({ variant: 'error', title: 'Nie udało się usunąć', description: getApiMessage(error) });
    } finally {
      setDeleteTarget(null);
    }
  }

  const rows = reviews.data?.results ?? [];

  let body;
  if (reviews.isLoading) {
    body = (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  } else if (reviews.isError) {
    body = (
      <EmptyState
        title="Nie udało się wczytać recenzji"
        description="Spróbuj ponownie za chwilę."
        action={<Button onClick={() => reviews.refetch()}>Odśwież</Button>}
      />
    );
  } else if (rows.length === 0) {
    body = (
      <EmptyState
        icon={<StarIcon size={24} />}
        title="Brak recenzji"
        description="Nie ma recenzji dla wybranego filtra."
      />
    );
  } else {
    body = (
      <div className="flex flex-col gap-3">
        {rows.map((review) => (
          <article key={review.id} className="rounded-lg border border-ink-100 bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Rating value={review.rating} readOnly size={16} showValue />
                  <span className="text-sm font-semibold">{review.garden.title}</span>
                  <span className="text-[12px] text-ink-500">· {review.garden.city}</span>
                </div>
                <div className="mt-1 text-[12px] text-ink-500">
                  {review.author.full_name} · {review.author.email} · {formatDate(review.created_at)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger-soft"
                leftIcon={<Trash2 className="size-3.5" />}
                onClick={() => setDeleteTarget(review)}
              >
                Usuń
              </Button>
            </div>
            {review.comment && (
              <p className="mt-3 rounded-md bg-ink-50 px-3 py-2 text-sm text-ink-700">{review.comment}</p>
            )}
          </article>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[28px] font-bold tracking-tight">Moderacja recenzji</h1>
        <p className="mt-1.5 text-sm text-ink-500">Przeglądaj recenzje i usuwaj te naruszające zasady.</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-end gap-3 border-b border-ink-100 pb-4">
        <div className="w-40">
          <Select value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="">Każda ocena</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} ★ i wyżej
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full max-w-xs">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj w treści recenzji…"
            leadingIcon={<Search className="size-4" />}
          />
        </div>
      </div>

      {body}

      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="Usunąć recenzję?"
        description={
          deleteTarget
            ? `Recenzja ${deleteTarget.author.full_name} dla „${deleteTarget.garden.title}” zostanie trwale usunięta.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Anuluj
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={confirmDelete}>
              Usuń recenzję
            </Button>
          </>
        }
      />
    </div>
  );
}
