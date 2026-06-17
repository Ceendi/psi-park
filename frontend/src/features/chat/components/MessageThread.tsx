import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router';
import { isSameDay } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { Avatar, Button, Spinner } from '@/shared/ui';
import { formatDate, parseISO } from '@/shared/lib/dates';
import type { ChatMessage, Conversation } from '@/shared/api/types';
import { useChatSocket } from '../useChatSocket';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';

function MessageRow({
  message,
  meId,
  lastOwnId,
}: {
  message: ChatMessage;
  meId: number | undefined;
  lastOwnId: number | null;
}) {
  const own = message.sender === meId;
  return <MessageBubble message={message} own={own} showReceipt={own && message.id === lastOwnId} />;
}

/** The active conversation thread: header, history, live stream, composer. */
export function MessageThread({
  conversation,
  meId,
}: {
  conversation: Conversation;
  meId: number | undefined;
}) {
  const counterpart = meId === conversation.client.id ? conversation.host : conversation.client;
  const chat = useChatSocket(conversation.id, meId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);

  // Auto-scroll on a new message (not when prepending older history).
  useEffect(() => {
    if (chat.messages.length > lastCountRef.current) {
      bottomRef.current?.scrollIntoView?.({ block: 'end' });
    }
    lastCountRef.current = chat.messages.length;
  }, [chat.messages.length]);

  const lastOwnId = useMemo(() => {
    for (let i = chat.messages.length - 1; i >= 0; i -= 1) {
      if (chat.messages[i].sender === meId) return chat.messages[i].id;
    }
    return null;
  }, [chat.messages, meId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-ink-100 p-4">
        <Avatar name={counterpart.full_name} size={40} tone="green" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{counterpart.full_name}</div>
          <div className="truncate text-[12px] text-ink-500">
            {conversation.garden.title} · {conversation.garden.city}
          </div>
        </div>
        <Link
          to={`/ogrody/${conversation.garden.id}`}
          className="inline-flex items-center gap-1.5 rounded-pill px-3 py-2 text-[12px] font-semibold text-green-800 transition hover:bg-green-50"
        >
          <ExternalLink className="size-3.5" />
          Zobacz ogród
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {chat.loadingHistory ? (
          <div className="grid place-items-center py-10 text-green-700">
            <Spinner size={24} />
          </div>
        ) : chat.messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">
            Brak wiadomości. Napisz pierwszą, aby rozpocząć rozmowę.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {chat.hasMore && (
              <div className="flex justify-center">
                <Button variant="secondary" size="sm" loading={chat.loadingOlder} onClick={chat.loadOlder}>
                  Wczytaj starsze
                </Button>
              </div>
            )}
            {chat.messages.map((message, index) => {
              const prev = chat.messages[index - 1];
              const showDay = !prev || !isSameDay(parseISO(prev.created_at), parseISO(message.created_at));
              return (
                <div key={message.id} className="flex flex-col gap-3">
                  {showDay && (
                    <div className="my-1 text-center text-[11px] font-medium uppercase tracking-wider text-ink-300">
                      {formatDate(message.created_at)}
                    </div>
                  )}
                  <MessageRow message={message} meId={meId} lastOwnId={lastOwnId} />
                </div>
              );
            })}
            {chat.typingFromOther && (
              <div className="px-1 text-[12px] italic text-ink-500">{counterpart.full_name} pisze…</div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <MessageComposer onSend={chat.sendMessage} onTyping={chat.notifyTyping} disabled={chat.status !== 'open'} />
    </div>
  );
}
