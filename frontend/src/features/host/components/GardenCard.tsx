import type { ReactNode } from 'react';
import { Eye, Image as ImageIcon, Pencil, Trash2 } from 'lucide-react';
import { Badge, Toggle } from '@/shared/ui';
import { formatPLN } from '@/shared/lib/money';
import type { Garden } from '@/shared/api/types';
import { gardenStatusBadge } from '../status';

export interface GardenCardProps {
  garden: Garden;
  onEdit: (id: number) => void;
  onDelete: (garden: Garden) => void;
  onToggleActive: (id: number, isActive: boolean) => void;
  onView: (id: number) => void;
  toggling?: boolean;
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
      <div className="flex items-center gap-1 text-[15px] font-bold tracking-tight">{value}</div>
    </div>
  );
}

/** Host "Moje ogrody" card (docs/design/project/Host Panel.html — `.garden-card`). */
export function GardenCard({
  garden,
  onEdit,
  onDelete,
  onToggleActive,
  onView,
  toggling,
}: GardenCardProps) {
  const badge = gardenStatusBadge(garden);
  const cover = garden.photos[0]?.thumbnail ?? garden.photos[0]?.image ?? null;
  const approved = garden.verification_status === 'approved';

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-ink-100 bg-surface transition hover:shadow-2">
      <div className="relative aspect-video bg-gradient-to-br from-green-100 to-green-500">
        {cover && <img src={cover} alt={garden.title} loading="lazy" className="size-full object-cover" />}
        <span className="absolute left-3 top-3">
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </span>
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-pill bg-ink-900/70 px-2.5 py-1 text-[11px] font-semibold text-bone backdrop-blur">
          <ImageIcon className="size-3" />
          {garden.photos.length} zdjęć
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[17px] font-semibold leading-snug tracking-tight">{garden.title}</h3>
        <div className="mb-4 mt-0.5 text-[13px] text-ink-500">
          {garden.city} · {garden.area_m2} m²
        </div>

        {garden.verification_status === 'rejected' && garden.rejection_reason && (
          <p className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger-ink">
            Powód odrzucenia: {garden.rejection_reason}
          </p>
        )}

        <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-md bg-ink-50 p-3.5">
          <Stat label="Ocena" value={garden.rating_avg != null ? garden.rating_avg.toFixed(2).replace('.', ',') : '—'} />
          <Stat label="Recenzje" value={garden.rating_count} />
          <Stat label="Powierzchnia" value={<span className="text-[13px]">{garden.area_m2} m²</span>} />
        </div>

        {approved && (
          <Toggle
            className="mb-4"
            label={garden.is_active ? 'Widoczny w katalogu' : 'Wstrzymany'}
            checked={garden.is_active}
            disabled={toggling}
            onChange={(e) => onToggleActive(garden.id, e.target.checked)}
          />
        )}

        <div className="mt-auto flex items-center gap-2 border-t border-ink-100 pt-3.5">
          <span className="mr-auto text-[13px] text-ink-700">
            <strong className="text-base font-bold text-ink-900">{formatPLN(garden.price_per_hour)}</strong> / godz.
          </span>
          {approved && (
            <button
              type="button"
              onClick={() => onView(garden.id)}
              className="inline-flex items-center gap-1.5 rounded-pill px-3 py-2 text-[12px] font-semibold text-ink-700 transition hover:bg-ink-50 hover:text-ink-900"
            >
              <Eye className="size-3.5" />
              Zobacz
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(garden.id)}
            className="inline-flex items-center gap-1.5 rounded-pill border border-ink-200 px-3 py-2 text-[12px] font-semibold text-ink-900 transition hover:border-ink-900"
          >
            <Pencil className="size-3.5" />
            Edytuj
          </button>
          <button
            type="button"
            onClick={() => onDelete(garden)}
            aria-label="Usuń ofertę"
            className="grid size-8 place-items-center rounded-full border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] text-danger transition hover:bg-danger-soft"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
