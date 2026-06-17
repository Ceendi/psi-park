import type { ReactNode } from 'react';
import { Check, Mail, MapPin, Phone, X } from 'lucide-react';
import { Badge, Button } from '@/shared/ui';
import { MapView } from '@/shared/ui/MapView';
import { formatPLN } from '@/shared/lib/money';
import type { AdminGarden } from '@/shared/api/types';
import { VERIFICATION_BADGE } from '../labels';

interface AmenityDisplay {
  code: string;
  label: string;
}

function Param({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
      <div className="text-sm font-semibold text-ink-900">{value}</div>
    </div>
  );
}

/** A full garden card for the admin verification queue (PLAN F8). */
export function GardenQueueCard({
  garden,
  onApprove,
  onReject,
  approving,
}: {
  garden: AdminGarden;
  onApprove: (id: number) => void;
  onReject: (garden: AdminGarden) => void;
  approving?: boolean;
}) {
  const badge = VERIFICATION_BADGE[garden.verification_status];
  const amenities = (garden.amenities_display ?? []) as unknown as AmenityDisplay[];
  const rules = (garden.rules as string[] | null) ?? [];
  const lat = Number(garden.latitude);
  const lng = Number(garden.longitude);

  return (
    <article className="overflow-hidden rounded-lg border border-ink-100 bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-lg font-semibold tracking-tight">{garden.title}</h3>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[13px] text-ink-500">
            <MapPin className="size-3.5" />
            {garden.city} · {garden.address}
          </div>
        </div>
        {garden.verification_status === 'pending' && (
          <div className="flex gap-2">
            <Button size="sm" leftIcon={<Check className="size-3.5" />} loading={approving} onClick={() => onApprove(garden.id)}>
              Zatwierdź
            </Button>
            <Button variant="danger" size="sm" leftIcon={<X className="size-3.5" />} onClick={() => onReject(garden)}>
              Odrzuć
            </Button>
          </div>
        )}
      </div>

      {garden.verification_status === 'rejected' && garden.rejection_reason && (
        <p className="border-b border-ink-100 bg-danger-soft px-5 py-2.5 text-[13px] text-danger-ink">
          Powód odrzucenia: {garden.rejection_reason}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {garden.photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {garden.photos.slice(0, 6).map((photo) => (
                <img
                  key={photo.id}
                  src={photo.thumbnail ?? photo.image}
                  alt=""
                  className="aspect-video w-full rounded-md object-cover"
                />
              ))}
            </div>
          ) : (
            <div className="grid h-24 place-items-center rounded-md border border-dashed border-ink-200 text-[13px] text-ink-500">
              Brak zdjęć (host musi dodać min. 5)
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 rounded-md bg-ink-50 p-3.5">
            <Param label="Powierzchnia" value={`${garden.area_m2} m²`} />
            <Param label="Cena/h" value={formatPLN(garden.price_per_hour)} />
            <Param label="Maks. psów" value={garden.max_dogs} />
            <Param label="Nawierzchnia" value={garden.surface_type} />
            <Param label="Ogrodzenie" value={garden.is_fenced ? `Tak${garden.fence_height_m ? ` (${garden.fence_height_m} m)` : ''}` : 'Nie'} />
            <Param label="Godziny" value={`${String(garden.open_from).slice(0, 5)}–${String(garden.open_to).slice(0, 5)}`} />
          </div>

          <p className="text-[13px] leading-relaxed text-ink-700">{garden.description}</p>

          {amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {amenities.map((a) => (
                <Badge key={a.code} variant="neutral">
                  {a.label}
                </Badge>
              ))}
            </div>
          )}

          {rules.length > 0 && (
            <ul className="list-inside list-disc text-[13px] text-ink-700">
              {rules.map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-ink-100 p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-500">Gospodarz</div>
            <div className="text-sm font-semibold text-ink-900">{garden.host.full_name}</div>
            <div className="mt-1.5 flex flex-col gap-1 text-[13px] text-ink-700">
              <a href={`mailto:${garden.host.email}`} className="flex items-center gap-1.5 hover:text-green-800">
                <Mail className="size-3.5" />
                {garden.host.email}
              </a>
              {garden.host.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5" />
                  {garden.host.phone}
                </span>
              )}
            </div>
            {garden.host.is_verified_host && (
              <Badge variant="success" className="mt-2">
                Zweryfikowany gospodarz
              </Badge>
            )}
          </div>

          {Number.isFinite(lat) && Number.isFinite(lng) && (
            <MapView center={{ lat, lng }} zoom={14} height={200} markers={[{ id: garden.id, lat, lng }]} />
          )}
        </div>
      </div>
    </article>
  );
}
