import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, EmptyState, Modal, PawIcon, Skeleton, useToast } from '@/shared/ui';
import type { DogListItem } from '@/shared/api/types';
import { getApiMessage } from '@/features/account/forms';
import { useDeleteDog, useDogs, useUploadDogPhoto } from './api';
import { DogCard } from './components/DogCard';
import { DogFormModal } from './components/DogFormModal';

/** Client panel — "Moi pupile" (docs/design/project/Client Panel.html, `#page-pets`). */
export function PetsPage() {
  const { toast } = useToast();
  const dogs = useDogs();
  const deleteDog = useDeleteDog();
  const uploadPhoto = useUploadDogPhoto();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DogListItem | null>(null);

  function openCreate() {
    setEditingId(null);
    setFormOpen(true);
  }
  function openEdit(id: number) {
    setEditingId(id);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteDog.mutateAsync(pendingDelete.id);
      toast({ variant: 'success', title: 'Usunięto psa', description: `${pendingDelete.name} został usunięty.` });
    } catch (error) {
      toast({ variant: 'error', title: 'Nie udało się usunąć', description: getApiMessage(error) });
    } finally {
      setPendingDelete(null);
    }
  }

  function handleAddPhoto(id: number, file: File) {
    uploadPhoto.mutate(
      { id, file },
      {
        onSuccess: () => toast({ variant: 'success', title: 'Zaktualizowano zdjęcie' }),
        onError: (error) =>
          toast({ variant: 'error', title: 'Nie udało się wgrać zdjęcia', description: getApiMessage(error) }),
      },
    );
  }

  const header = (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Moi pupile</h1>
        <p className="mt-1.5 text-sm text-ink-500">
          Dodaj wszystkich psów, z którymi będziesz rezerwować ogrody.
        </p>
      </div>
      <Button leftIcon={<Plus className="size-3.5" />} onClick={openCreate}>
        Dodaj psa
      </Button>
    </div>
  );

  let body;
  if (dogs.isLoading) {
    body = (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-72 rounded-lg" />
        ))}
      </div>
    );
  } else if (dogs.isError) {
    body = (
      <EmptyState
        title="Nie udało się wczytać pupili"
        description="Spróbuj odświeżyć — coś poszło nie tak po stronie serwera."
        action={<Button onClick={() => dogs.refetch()}>Spróbuj ponownie</Button>}
      />
    );
  } else if (!dogs.data || dogs.data.results.length === 0) {
    body = (
      <EmptyState
        icon={<PawIcon size={24} />}
        title="Nie masz jeszcze żadnego psa"
        description="Dodaj profil pupila, aby móc rezerwować ogrody i otrzymywać rekomendacje."
        action={
          <Button leftIcon={<Plus className="size-3.5" />} onClick={openCreate}>
            Dodaj psa
          </Button>
        }
      />
    );
  } else {
    body = (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {dogs.data.results.map((dog) => (
          <DogCard
            key={dog.id}
            dog={dog}
            onEdit={openEdit}
            onDelete={setPendingDelete}
            onAddPhoto={handleAddPhoto}
            uploading={uploadPhoto.isPending && uploadPhoto.variables?.id === dog.id}
          />
        ))}
        <button
          type="button"
          onClick={openCreate}
          className="group flex min-h-[18rem] flex-col items-center justify-center gap-3 rounded-lg border-[1.5px] border-dashed border-ink-200 bg-surface p-6 text-center text-ink-500 transition hover:border-green-700 hover:bg-green-50 hover:text-green-800"
        >
          <span className="grid size-14 place-items-center rounded-full bg-ink-50 transition group-hover:bg-green-100">
            <Plus className="size-6" />
          </span>
          <span className="text-[15px] font-semibold">Dodaj kolejnego psa</span>
          <span className="max-w-56 text-xs leading-relaxed">
            Im więcej danych podasz, tym lepsze rekomendacje ogrodów dostaniesz.
          </span>
        </button>
      </div>
    );
  }

  return (
    <div>
      {header}
      {body}

      <DogFormModal open={formOpen} onClose={() => setFormOpen(false)} dogId={editingId} />

      <Modal
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        title="Usunąć profil psa?"
        description={
          pendingDelete
            ? `Profil „${pendingDelete.name}” zostanie trwale usunięty. Tej operacji nie można cofnąć.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Anuluj
            </Button>
            <Button variant="danger" loading={deleteDog.isPending} onClick={confirmDelete}>
              Usuń psa
            </Button>
          </>
        }
      />
    </div>
  );
}
