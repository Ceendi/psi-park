import { useNavigate } from 'react-router';
import { Heart, MapPin } from 'lucide-react';
import { StarFilledIcon } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { formatPLN } from '@/shared/lib/money';
import type { GardenListItem } from '@/shared/api/types';
import { SURFACE_LABELS } from '../labels';

export interface GardenCardProps {
  garden: GardenListItem;
  saved: boolean;
  onToggleSave: (id: number) => void;
  highlighted?: boolean;
  onHover?: (id: number | null) => void;
}

/** Catalogue card (Home Page.html `.listing`): cover, heart, price, rating, meta. */
export function GardenCard({ garden, saved, onToggleSave, highlighted, onHover }: GardenCardProps) {
  const navigate = useNavigate();
  const rating = garden.rating_avg;

  return (
    <article
      onClick={() => navigate(`/ogrody/${garden.id}`)}
      onMouseEnter={() => onHover?.(garden.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        'group cursor-pointer overflow-hidden rounded-lg border bg-surface transition',
        highlighted ? 'border-green-700 shadow-2' : 'border-ink-100 hover:shadow-2',
      )}
    >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-green-100 to-green-500">
        {garden.cover_image && (
          <img src={garden.cover_image} alt={garden.title} loading="lazy" className="size-full object-cover" />
        )}
        <button
          type="button"
          aria-label={saved ? 'Usuń z zapisanych' : 'Zapisz'}
          aria-pressed={saved}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(garden.id);
          }}
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-surface/85 text-ink-700 backdrop-blur transition hover:scale-105"
        >
          <Heart className={cn('size-4', saved && 'fill-danger text-danger')} />
        </button>
        <span className="absolute bottom-3 left-3 rounded-pill bg-ink-900/75 px-2.5 py-1 font-mono text-[12px] font-semibold text-bone backdrop-blur">
          {formatPLN(garden.price_per_hour)} / h
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold leading-snug tracking-tight">{garden.title}</h3>
          <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold">
            <StarFilledIcon size={13} className="text-sun" />
            {rating != null ? rating.toFixed(2).replace('.', ',') : '—'}
            <span className="font-normal text-ink-500">({garden.rating_count})</span>
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[13px] text-ink-500">
          <MapPin className="size-3.5" />
          {garden.city}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5 text-[12px] text-ink-700">
          <span className="rounded-pill bg-ink-50 px-2.5 py-1">{garden.area_m2} m²</span>
          <span className="rounded-pill bg-ink-50 px-2.5 py-1">{SURFACE_LABELS[garden.surface_type]}</span>
          <span className="rounded-pill bg-ink-50 px-2.5 py-1">do {garden.max_dogs} psów</span>
        </div>
      </div>
    </article>
  );
}
