import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button, EmptyState, Input, ShieldIcon, Skeleton, Tabs, useToast } from '@/shared/ui';
import type { AdminGarden, VerificationStatus } from '@/shared/api/types';
import { getApiMessage } from './errors';
import { useAdminGardens, useApproveGarden } from './api';
import { GardenQueueCard } from './components/GardenQueueCard';
import { RejectGardenModal } from './components/RejectGardenModal';

type Filter = VerificationStatus | 'all';

const TABS: { value: Filter; label: string }[] = [
  { value: 'pending', label: 'Oczekujące' },
  { value: 'approved', label: 'Zatwierdzone' },
  { value: 'rejected', label: 'Odrzucone' },
  { value: 'all', label: 'Wszystkie' },
];

/** Admin — garden verification queue (PLAN F8, AD-12). */
export function VerificationQueuePage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [rejectTarget, setRejectTarget] = useState<AdminGarden | null>(null);

  const gardens = useAdminGardens(filter, search);
  const approve = useApproveGarden();

  function handleApprove(id: number) {
    approve.mutate(id, {
      onSuccess: () => toast({ variant: 'success', title: 'Ogród zatwierdzony', description: 'Oferta jest teraz publiczna.' }),
      onError: (error) => toast({ variant: 'error', title: 'Nie udało się zatwierdzić', description: getApiMessage(error) }),
    });
  }

  const rows = gardens.data?.results ?? [];

  let body;
  if (gardens.isLoading) {
    body = (
      <div className="flex flex-col gap-5">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-72 rounded-lg" />
        ))}
      </div>
    );
  } else if (gardens.isError) {
    body = (
      <EmptyState
        title="Nie udało się wczytać kolejki"
        description="Spróbuj ponownie za chwilę."
        action={<Button onClick={() => gardens.refetch()}>Odśwież</Button>}
      />
    );
  } else if (rows.length === 0) {
    body = (
      <EmptyState
        icon={<ShieldIcon size={24} />}
        title={filter === 'pending' ? 'Kolejka jest pusta' : 'Brak ogrodów'}
        description={
          filter === 'pending'
            ? 'Wszystkie zgłoszenia zostały rozpatrzone. Dobra robota!'
            : 'Brak ogrodów dla wybranego filtra.'
        }
      />
    );
  } else {
    body = (
      <div className="flex flex-col gap-5">
        {rows.map((garden) => (
          <GardenQueueCard
            key={garden.id}
            garden={garden}
            onApprove={handleApprove}
            onReject={setRejectTarget}
            approving={approve.isPending && approve.variables === garden.id}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[28px] font-bold tracking-tight">Kolejka weryfikacji</h1>
        <p className="mt-1.5 text-sm text-ink-500">Sprawdź zgłoszone ogrody i zatwierdź lub odrzuć je z uzasadnieniem.</p>
      </div>

      <div className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-ink-100 pb-4">
        <Tabs
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          items={TABS.map((t) => ({
            value: t.value,
            label: t.label,
            count: t.value === filter ? gardens.data?.count : undefined,
          }))}
        />
        <div className="w-full max-w-xs">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj ogrodu lub miasta…"
            leadingIcon={<Search className="size-4" />}
          />
        </div>
      </div>

      {body}

      <RejectGardenModal garden={rejectTarget} onClose={() => setRejectTarget(null)} />
    </div>
  );
}
