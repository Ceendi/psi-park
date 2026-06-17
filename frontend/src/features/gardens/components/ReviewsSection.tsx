import { useState } from 'react';
import { Avatar, Pagination, Rating, Skeleton, StarFilledIcon } from '@/shared/ui';
import { formatDate } from '@/shared/lib/dates';
import { useGardenReviews } from '../api';

/** Public reviews for a garden with paging (Garden Detail.html `.reviews`). */
export function ReviewsSection({
  gardenId,
  ratingAvg,
  ratingCount,
}: {
  gardenId: number;
  ratingAvg: number | null;
  ratingCount: number;
}) {
  const [page, setPage] = useState(1);
  const reviews = useGardenReviews(gardenId, page);
  const rows = reviews.data?.results ?? [];
  const pageCount = Math.ceil((reviews.data?.count ?? 0) / 6);

  return (
    <section id="reviews" className="scroll-mt-28">
      <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
        <StarFilledIcon size={18} className="text-sun" />
        {ratingAvg != null ? ratingAvg.toFixed(2).replace('.', ',') : '—'}
        <span className="font-normal text-ink-500">· {ratingCount} recenzji</span>
      </h3>

      {reviews.isLoading ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : ratingCount === 0 || rows.length === 0 ? (
        <p className="mt-4 rounded-lg bg-ink-50 px-4 py-6 text-center text-sm text-ink-500">
          Ten ogród nie ma jeszcze recenzji.
        </p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {rows.map((review) => (
              <article key={review.id} className="rounded-lg border border-ink-100 bg-surface p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={review.author.full_name} size={40} tone="green" />
                  <div>
                    <div className="text-sm font-semibold">{review.author.full_name}</div>
                    <div className="text-[12px] text-ink-500">{formatDate(review.created_at)}</div>
                  </div>
                </div>
                <Rating value={review.rating} readOnly size={14} className="mt-3" />
                {review.comment && <p className="mt-2 text-[13px] leading-relaxed text-ink-700">{review.comment}</p>}
              </article>
            ))}
          </div>
          <Pagination className="mt-6" page={page} pageCount={pageCount} onChange={setPage} />
        </>
      )}
    </section>
  );
}
