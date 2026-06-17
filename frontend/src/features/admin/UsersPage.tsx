import { useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Input,
  Modal,
  Select,
  Skeleton,
  Table,
  Tabs,
  useToast,
} from '@/shared/ui';
import type { BadgeVariant, Column } from '@/shared/ui';
import { formatDate } from '@/shared/lib/dates';
import type { AdminUser, UserRole } from '@/shared/api/types';
import { getApiMessage } from './errors';
import { ROLE_LABEL } from './labels';
import { useAdminUsers, useBlockUser, useUnblockUser, useVerifyHost } from './api';

type RoleFilter = UserRole | 'all';
type StatusFilter = 'all' | 'active' | 'blocked';

const ROLE_VARIANT: Record<UserRole, BadgeVariant> = {
  client: 'neutral',
  host: 'info',
  admin: 'solid',
};

const ROLE_TABS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'Wszyscy' },
  { value: 'client', label: 'Klienci' },
  { value: 'host', label: 'Gospodarze' },
  { value: 'admin', label: 'Administratorzy' },
];

/** Admin — user management (verify host / block / unblock) (PLAN F8). */
export function UsersPage() {
  const { toast } = useToast();
  const [role, setRole] = useState<RoleFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [blockTarget, setBlockTarget] = useState<AdminUser | null>(null);

  const users = useAdminUsers(role, status, search);
  const verify = useVerifyHost();
  const block = useBlockUser();
  const unblock = useUnblockUser();

  function toastOpts(successTitle: string) {
    return {
      onSuccess: () => toast({ variant: 'success' as const, title: successTitle }),
      onError: (error: unknown) =>
        toast({ variant: 'error' as const, title: 'Akcja nie powiodła się', description: getApiMessage(error) }),
    };
  }

  async function confirmBlock() {
    if (!blockTarget) return;
    try {
      await block.mutateAsync(blockTarget.id);
      toast({ variant: 'success', title: 'Konto zablokowane' });
    } catch (error) {
      toast({ variant: 'error', title: 'Nie udało się zablokować', description: getApiMessage(error) });
    } finally {
      setBlockTarget(null);
    }
  }

  const columns: Column<AdminUser>[] = [
    {
      key: 'user',
      header: 'Użytkownik',
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={u.full_name} size={36} tone="green" />
          <div className="min-w-0">
            <div className="flex items-center gap-1 font-semibold">
              <span className="truncate">{u.full_name}</span>
              {u.is_verified_host && <ShieldCheck className="size-3.5 shrink-0 text-green-700" />}
            </div>
            <div className="text-[11px] text-ink-500">{u.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Rola', render: (u) => <Badge variant={ROLE_VARIANT[u.role]}>{ROLE_LABEL[u.role]}</Badge> },
    {
      key: 'status',
      header: 'Status',
      render: (u) =>
        u.is_active ? <Badge variant="success">Aktywne</Badge> : <Badge variant="danger">Zablokowane</Badge>,
    },
    { key: 'joined', header: 'Dołączył', render: (u) => formatDate(u.created_at) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) => (
        <div className="flex justify-end gap-2">
          {u.role === 'host' && !u.is_verified_host && u.is_active && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => verify.mutate(u.id, toastOpts('Gospodarz zweryfikowany'))}
            >
              Zweryfikuj
            </Button>
          )}
          {u.role !== 'admin' &&
            (u.is_active ? (
              <Button size="sm" variant="danger" onClick={() => setBlockTarget(u)}>
                Zablokuj
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => unblock.mutate(u.id, toastOpts('Konto odblokowane'))}
              >
                Odblokuj
              </Button>
            ))}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[28px] font-bold tracking-tight">Użytkownicy</h1>
        <p className="mt-1.5 text-sm text-ink-500">Weryfikuj gospodarzy oraz blokuj i odblokowuj konta.</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-ink-100 pb-4">
        <Tabs value={role} onChange={(v) => setRole(v as RoleFilter)} items={ROLE_TABS} />
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-40">
            <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
              <option value="all">Wszystkie statusy</option>
              <option value="active">Aktywne</option>
              <option value="blocked">Zablokowane</option>
            </Select>
          </div>
          <div className="w-full max-w-xs">
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj e-maila lub nazwiska…"
              leadingIcon={<Search className="size-4" />}
            />
          </div>
        </div>
      </div>

      {users.isLoading ? (
        <Skeleton className="h-72 rounded-lg" />
      ) : users.isError ? (
        <div className="rounded-lg border border-ink-100 bg-surface p-10 text-center">
          <p className="mb-3 text-sm text-ink-500">Nie udało się wczytać użytkowników.</p>
          <Button onClick={() => users.refetch()}>Odśwież</Button>
        </div>
      ) : (
        <Table
          columns={columns}
          data={users.data?.results ?? []}
          rowKey={(u) => u.id}
          emptyMessage="Brak użytkowników dla tego filtra."
        />
      )}

      <Modal
        open={blockTarget != null}
        onClose={() => setBlockTarget(null)}
        title="Zablokować konto?"
        description={
          blockTarget
            ? `${blockTarget.full_name} (${blockTarget.email}) nie będzie mógł się zalogować do czasu odblokowania.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setBlockTarget(null)}>
              Anuluj
            </Button>
            <Button variant="danger" loading={block.isPending} onClick={confirmBlock}>
              Zablokuj konto
            </Button>
          </>
        }
      />
    </div>
  );
}
