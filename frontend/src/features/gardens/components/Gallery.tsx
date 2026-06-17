import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { Modal } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import type { GardenPhoto } from '@/shared/api/types';

/** Photo mosaic (1 large + 2×2) with a "show all" lightbox (Garden Detail.html). */
export function Gallery({ photos, title }: { photos: GardenPhoto[]; title: string }) {
  const [open, setOpen] = useState(false);
  const tiles = photos.slice(0, 5);

  if (photos.length === 0) {
    return <div className="aspect-[16/7] w-full rounded-lg bg-gradient-to-br from-green-100 to-green-500" />;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-2 overflow-hidden rounded-lg md:grid-cols-4 md:grid-rows-2">
        {tiles.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              'group relative overflow-hidden bg-ink-100',
              i === 0 ? 'md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto' : 'aspect-[4/3] hidden md:block',
            )}
          >
            <img
              src={photo.image}
              alt={`${title} — zdjęcie ${i + 1}`}
              loading={i === 0 ? 'eager' : 'lazy'}
              className="size-full object-cover transition group-hover:brightness-95"
            />
            {i === tiles.length - 1 && photos.length > 0 && (
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-pill bg-surface px-3 py-1.5 text-[13px] font-semibold shadow-2">
                <LayoutGrid className="size-3.5" />
                Pokaż wszystkie zdjęcia ({photos.length})
              </span>
            )}
          </button>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} size="lg" title={`Galeria — ${title}`}>
        <div className="grid max-h-[70vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
          {photos.map((photo) => (
            <img
              key={photo.id}
              src={photo.image}
              alt={title}
              loading="lazy"
              className="w-full rounded-md object-cover"
            />
          ))}
        </div>
      </Modal>
    </>
  );
}
