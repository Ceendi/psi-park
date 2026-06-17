import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { Button, EmptyState, GardenIcon, Modal, Skeleton, useToast } from '@/shared/ui';
import type { Garden } from '@/shared/api/types';
import { getApiMessage } from '@/features/account/forms';
import { useDeleteGarden, useHostGardens, useToggleGardenActive } from './api';
import { GardenCard } from './components/GardenCard';

/** Host panel — "Moje ogrody" (docs/design/project/Host Panel.html, `#page-gardens`). */
export function GardensPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const gardens = useHostGardens();
  const toggleActive = useToggleGardenActive();
  const deleteGarden = useDeleteGarden();
  const [pendingDelete, setPendingDelete] = useState<Garden | null>(null);

  function handleToggle(id: number, isActive: boolean) {
    toggleActive.mutate(
      { id, isActive },
      {
        onError: (error) =>
          toast({ variant: 'error', title: 'Nie udało się zmienić statusu', description: getApiMessage(error) }),
      },
    );
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteGarden.mutateAsync(pendingDelete.id);
      toast({ variant: 'success', title: 'Ogród usunięty', description: `„${pendingDelete.title}” został usunięty.` });
    } catch (error) {
      toast({ variant: 'error', title: 'Nie udało się usunąć', description: getApiMessage(error) });
    } finally {
      setPendingDelete(null);
    }
  }

  const header = (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Moje ogrody</h1>
        <p className="mt-1.5 text-sm text-ink-500">Zarządzaj ofertami, edytuj zdjęcia, ceny i dostępność.</p>
      </div>
      <Button leftIcon={<Plus className="size-3.5" />} onClick={() => navigate('/gospodarz/ogrody/nowy')}>
        Dodaj ogród
      </Button>
    </div>
  );

  let body;
  if (gardens.isLoading) {
    body = (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-96 rounded-lg" />
        ))}
      </div>
    );
  } else if (gardens.isError) {
    body = (
      <EmptyState
        title="Nie udało się wczytać ogrodów"
        description="Spróbuj ponownie za chwilę."
        action={<Button onClick={() => gardens.refetch()}>Odśwież</Button>}
      />
    );
  } else if (!gardens.data || gardens.data.length === 0) {
    body = (
      <EmptyState
        icon={<GardenIcon size={24} />}
        title="Nie masz jeszcze żadnego ogrodu"
        description="Dodaj pierwszą ofertę — kilka zdjęć i opis wystarczą, by zacząć przyjmować rezerwacje."
        action={
          <Button leftIcon={<Plus className="size-3.5" />} onClick={() => navigate('/gospodarz/ogrody/nowy')}>
            Dodaj ogród
          </Button>
        }
      />
    );
  } else {
    body = (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {gardens.data.map((garden) => (
          <GardenCard
            key={garden.id}
            garden={garden}
            onEdit={(id) => navigate(`/gospodarz/ogrody/${id}/edycja`)}
            onDelete={setPendingDelete}
            onToggleActive={handleToggle}
            onView={(id) => navigate(`/ogrody/${id}`)}
            toggling={toggleActive.isPending && toggleActive.variables?.id === garden.id}
          />
        ))}
        <button
          type="button"
          onClick={() => navigate('/gospodarz/ogrody/nowy')}
          className="group flex min-h-[24rem] flex-col items-center justify-center gap-3 rounded-lg border-[1.5px] border-dashed border-ink-200 bg-surface p-6 text-center text-ink-500 transition hover:border-green-700 hover:bg-green-50 hover:text-green-800"
        >
          <span className="grid size-14 place-items-center rounded-full bg-ink-50 transition group-hover:bg-green-100">
            <Plus className="size-6" />
          </span>
          <span className="text-[15px] font-semibold">Dodaj nowy ogród</span>
          <span className="max-w-60 text-xs leading-relaxed">
            Zacznij od kilku zdjęć i opisu — oferta trafi do weryfikacji administratora.
          </span>
        </button>
      </div>
    );
  }

  return (
    <div>
      {header}
      {body}
      <Modal
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        title="Usunąć ofertę?"
        description={
          pendingDelete
            ? `„${pendingDelete.title}” zostanie usunięty. Jeśli ma rezerwacje, zostanie wstrzymany zamiast usunięty (zachowanie dokumentów).`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Anuluj
            </Button>
            <Button variant="danger" loading={deleteGarden.isPending} onClick={confirmDelete}>
              Usuń ofertę
            </Button>
          </>
        }
      />
    </div>
  );
}
