import { useRef } from 'react';
import { Camera, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Avatar, Badge, Button } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import type { DogListItem } from '@/shared/api/types';
import {
  describeDog,
  HEALTH_DOT,
  HEALTH_VALUE_TEXT,
  healthStatusLabel,
  healthTone,
} from '../health';

export interface DogCardProps {
  dog: DogListItem;
  onEdit: (id: number) => void;
  onDelete: (dog: DogListItem) => void;
  onAddPhoto: (id: number, file: File) => void;
  uploading?: boolean;
}

function HealthRow({ label, status }: { label: string; status: string | null | undefined }) {
  const tone = healthTone(status);
  return (
    <div className="flex items-center gap-2.5 text-[13px] text-ink-700">
      <span className={cn('size-2 shrink-0 rounded-full', HEALTH_DOT[tone])} />
      <span className="flex-1">{label}</span>
      <span className={cn('font-mono text-[11px]', HEALTH_VALUE_TEXT[tone])}>
        {healthStatusLabel(status)}
      </span>
    </div>
  );
}

/** A dog profile card (docs/design/project/Client Panel.html — `.pet-card`). */
export function DogCard({ dog, onEdit, onDelete, onAddPhoto, uploading }: DogCardProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const meta = describeDog(dog);

  return (
    <article className="relative flex flex-col rounded-lg border border-ink-100 bg-surface p-6 transition hover:border-green-300 hover:shadow-2">
      <div className="mb-4 flex items-start gap-4">
        <Avatar name={dog.name} src={dog.photo} size={72} tone="clay" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2.5">
            <h3 className="text-xl font-bold tracking-tight">{dog.name}</h3>
            <Badge variant="success">Aktywny</Badge>
          </div>
          <p className="text-[13px] leading-relaxed text-ink-500">
            {[dog.breed || 'Pies', dog.weight_kg ? `${dog.weight_kg} kg` : null, meta || null]
              .filter(Boolean)
              .join(' · ')}
            {dog.age_label && (
              <>
                <br />
                <strong className="font-semibold text-ink-900">{dog.age_label}</strong>
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onEdit(dog.id)}
          aria-label={`Edytuj ${dog.name}`}
          className="grid size-9 shrink-0 place-items-center rounded-full border border-ink-200 text-ink-700 transition hover:border-ink-900 hover:text-ink-900"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-2">
        <HealthRow label="Szczepienia" status={dog.vaccinations_status} />
        <HealthRow label="Odrobaczanie" status={dog.deworming_status} />
        <HealthRow label="Stan zdrowia" status={dog.health_status} />
      </div>

      <div className="mt-auto flex flex-wrap gap-2 border-t border-ink-100 pt-4">
        <Button variant="secondary" size="sm" leftIcon={<Pencil className="size-3.5" />} onClick={() => onEdit(dog.id)}>
          Edytuj profil
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Camera className="size-3.5" />}
          loading={uploading}
          onClick={() => fileRef.current?.click()}
        >
          Dodaj zdjęcie
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-danger hover:bg-danger-soft"
          leftIcon={<Trash2 className="size-3.5" />}
          onClick={() => onDelete(dog)}
        >
          Usuń
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onAddPhoto(dog.id, file);
          e.target.value = '';
        }}
      />
    </article>
  );
}
