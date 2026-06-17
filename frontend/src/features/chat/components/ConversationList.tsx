import { useState } from 'react';
import { isToday } from 'date-fns';
import { Search } from 'lucide-react';
import { Avatar, Input, Skeleton, Tabs } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { formatDateShort, formatTime } from '@/shared/lib/dates';
import type { Conversation } from '@/shared/api/types';
import type { LastMessage } from '../api';

function listTime(at: string | null): string {
  if (!at) return '';
  return isToday(new Date(at)) ? formatTime(at) : formatDateShort(at);
}

function ConversationRow({
  conversation,
  meId,
  active,
  onSelect,
}: {
  conversation: Conversation;
  meId: number | undefined;
  active: boolean;
  onSelect: (id: number) => void;
}) {
  const other = meId === conversation.client.id ? conversation.host : conversation.client;
  const last = conversation.last_message as LastMessage | null;
  const unread = conversation.unread_count > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={cn(
        'flex w-full items-center gap-3 border-b border-ink-100 px-4 py-3 text-left transition',
        active ? 'bg-green-50' : 'hover:bg-ink-50',
      )}
    >
      <Avatar name={other.full_name} size={44} tone="green" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('truncate text-sm', unread ? 'font-bold text-ink-900' : 'font-semibold')}>
            {other.full_name}
          </span>
          <span className="shrink-0 font-mono text-[11px] text-ink-300">
            {listTime(conversation.last_message_at)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className={cn('truncate text-[13px]', unread ? 'text-ink-700' : 'text-ink-500')}>
            {last?.content ?? conversation.garden.title}
          </span>
          {unread && (
            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-danger px-1.5 font-mono text-[11px] font-semibold text-bone">
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/** Left rail: searchable, filterable list of conversations sorted by recency. */
export function ConversationList({
  conversations,
  meId,
  activeId,
  loading,
  onSelect,
}: {
  conversations: Conversation[];
  meId: number | undefined;
  activeId: number | null;
  loading: boolean;
  onSelect: (id: number) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [search, setSearch] = useState('');

  const visible = conversations.filter((c) => {
    if (filter === 'unread' && c.unread_count === 0) return false;
    if (search) {
      const other = meId === c.client.id ? c.host : c.client;
      const haystack = `${other.full_name} ${c.garden.title}`.toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const unreadCount = conversations.filter((c) => c.unread_count > 0).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 border-b border-ink-100 p-4">
        <h1 className="text-lg font-bold tracking-tight">Wiadomości</h1>
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj rozmowy…"
          leadingIcon={<Search className="size-4" />}
        />
        <Tabs
          value={filter}
          onChange={(v) => setFilter(v as 'all' | 'unread')}
          items={[
            { value: 'all', label: 'Wszystkie', count: conversations.length },
            { value: 'unread', label: 'Nieprzeczytane', count: unreadCount },
          ]}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-md" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-500">
            {search || filter === 'unread' ? 'Brak rozmów dla tego filtra.' : 'Nie masz jeszcze żadnych rozmów.'}
          </p>
        ) : (
          visible.map((c) => (
            <ConversationRow
              key={c.id}
              conversation={c}
              meId={meId}
              active={c.id === activeId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
