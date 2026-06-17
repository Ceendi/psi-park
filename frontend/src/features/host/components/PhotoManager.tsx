import { Star, Trash2 } from 'lucide-react';
import { FileDropzone, useToast } from '@/shared/ui';
import type { Garden } from '@/shared/api/types';
import { getApiMessage } from '@/features/account/forms';
import {
  useDeleteGardenPhoto,
  useReorderGardenPhotos,
  useUploadGardenPhoto,
} from '../api';

const MAX_PHOTOS = 12;

/** Gallery manager for the garden form: upload, delete, set cover (PLAN §16.1 / B3). */
export function PhotoManager({ garden }: { garden: Garden }) {
  const { toast } = useToast();
  const upload = useUploadGardenPhoto(garden.id);
  const remove = useDeleteGardenPhoto(garden.id);
  const reorder = useReorderGardenPhotos(garden.id);
  const photos = garden.photos;

  function handleFiles(files: File[]) {
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast({ variant: 'error', title: `Maksymalnie ${MAX_PHOTOS} zdjęć` });
      return;
    }
    for (const file of files.slice(0, room)) {
      upload.mutate(file, {
        onError: (error) =>
          toast({ variant: 'error', title: 'Nie udało się wgrać zdjęcia', description: getApiMessage(error) }),
      });
    }
  }

  function setCover(photoId: number) {
    const ids = [photoId, ...photos.filter((p) => p.id !== photoId).map((p) => p.id)];
    reorder.mutate(ids, {
      onSuccess: () => toast({ variant: 'success', title: 'Ustawiono okładkę' }),
      onError: (error) =>
        toast({ variant: 'error', title: 'Nie udało się zmienić okładki', description: getApiMessage(error) }),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <div key={photo.id} className="group relative overflow-hidden rounded-md border border-ink-100">
              <img
                src={photo.thumbnail ?? photo.image}
                alt=""
                className="aspect-video w-full object-cover"
              />
              {index === 0 && (
                <span className="absolute left-2 top-2 rounded-pill bg-green-700 px-2 py-0.5 text-[10px] font-semibold text-bone">
                  Okładka
                </span>
              )}
              <div className="absolute right-2 top-2 flex gap-1.5">
                {index !== 0 && (
                  <button
                    type="button"
                    onClick={() => setCover(photo.id)}
                    aria-label="Ustaw jako okładkę"
                    className="grid size-7 place-items-center rounded-full bg-surface/90 text-ink-700 shadow-1 transition hover:text-green-700"
                  >
                    <Star className="size-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove.mutate(photo.id)}
                  aria-label="Usuń zdjęcie"
                  className="grid size-7 place-items-center rounded-full bg-surface/90 text-danger shadow-1 transition hover:bg-danger-soft"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {photos.length < MAX_PHOTOS && (
        <FileDropzone
          onFiles={handleFiles}
          hint={`Przeciągnij zdjęcia lub kliknij (${photos.length}/${MAX_PHOTOS}). Min. 5 do weryfikacji.`}
        />
      )}
    </div>
  );
}
