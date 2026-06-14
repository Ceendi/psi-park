import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export interface PaginationProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  className?: string;
}

type PageItem = number | 'ellipsis';

/** Build a compact page list: 1 … p-1 p p+1 … N. */
export function getPageItems(page: number, pageCount: number): PageItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const items: PageItem[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) items.push('ellipsis');
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < pageCount - 1) items.push('ellipsis');
  items.push(pageCount);
  return items;
}

export function Pagination({ page, pageCount, onChange, className }: PaginationProps) {
  if (pageCount <= 1) return null;
  const items = getPageItems(page, pageCount);

  const navBtn =
    'grid size-9 place-items-center rounded-pill border border-ink-200 text-ink-700 transition hover:border-ink-900 disabled:opacity-40 disabled:pointer-events-none';

  return (
    <nav className={cn('flex items-center gap-1.5', className)} aria-label="Paginacja">
      <button
        type="button"
        className={navBtn}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Poprzednia strona"
      >
        <ChevronLeft className="size-4" />
      </button>
      {items.map((item, index) =>
        item === 'ellipsis' ? (
          <span key={`e${index}`} className="px-1 text-ink-300">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page || undefined}
            className={cn(
              'grid size-9 place-items-center rounded-pill text-sm font-medium transition',
              item === page
                ? 'bg-green-700 text-bone'
                : 'text-ink-700 hover:bg-ink-50',
            )}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        className={navBtn}
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Następna strona"
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}
