import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useAuth } from '@/shared/auth';
import { cn } from '@/shared/lib/cn';
import { useConversations } from './api';
import { ConversationList } from './components/ConversationList';
import { MessageThread } from './components/MessageThread';

/**
 * Two-panel chat shared by the client and host dashboards (PLAN F7). `basePath`
 * is the dashboard's messages root so row selection deep-links to `…/:id`.
 */
export function ChatPage({ basePath }: { basePath: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const activeId = params.id ? Number(params.id) : null;

  const conversations = useConversations();
  const active = (conversations.data ?? []).find((c) => c.id === activeId) ?? null;

  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-1 overflow-hidden rounded-lg border border-ink-100 bg-surface lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside
        className={cn(
          'min-h-0 border-ink-100 lg:block lg:border-r',
          activeId ? 'hidden' : 'block',
        )}
      >
        <ConversationList
          conversations={conversations.data ?? []}
          meId={user?.id}
          activeId={activeId}
          loading={conversations.isLoading}
          onSelect={(id) => navigate(`${basePath}/${id}`)}
        />
      </aside>

      <section className={cn('min-h-0', activeId ? 'block' : 'hidden lg:block')}>
        {active ? (
          <div className="flex h-full min-h-0 flex-col">
            <button
              type="button"
              onClick={() => navigate(basePath)}
              className="flex items-center gap-1.5 border-b border-ink-100 px-4 py-2 text-sm text-ink-500 lg:hidden"
            >
              <ArrowLeft className="size-4" />
              Rozmowy
            </button>
            <div className="min-h-0 flex-1">
              <MessageThread key={active.id} conversation={active} meId={user?.id} />
            </div>
          </div>
        ) : (
          <div className="grid h-full place-items-center p-8 text-center">
            <div className="flex flex-col items-center gap-3 text-ink-500">
              <span className="grid size-14 place-items-center rounded-full bg-green-50 text-green-700">
                <MessageSquare className="size-6" />
              </span>
              <p className="text-sm">Wybierz rozmowę z listy, aby zobaczyć wiadomości.</p>
              {conversations.isError && (
                <Button variant="secondary" size="sm" onClick={() => conversations.refetch()}>
                  Odśwież
                </Button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
