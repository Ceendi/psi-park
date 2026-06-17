import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { formatTime } from '@/shared/lib/dates';
import type { ChatMessage } from '@/shared/api/types';

/** One chat bubble — own messages green on the right, others grey on the left. */
export function MessageBubble({
  message,
  own,
  showReceipt,
}: {
  message: ChatMessage;
  own: boolean;
  showReceipt: boolean;
}) {
  return (
    <div className={cn('flex', own ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[78%]')}>
        <div
          className={cn(
            'whitespace-pre-wrap break-words rounded-lg px-3.5 py-2.5 text-sm',
            own ? 'rounded-br-xs bg-green-700 text-bone' : 'rounded-bl-xs bg-ink-50 text-ink-900',
          )}
        >
          {message.content}
        </div>
        <div
          className={cn(
            'mt-1 flex items-center gap-1 px-1 text-[11px] text-ink-300',
            own ? 'justify-end' : 'justify-start',
          )}
        >
          <span className="font-mono">{formatTime(message.created_at)}</span>
          {own &&
            showReceipt &&
            (message.read_at ? (
              <CheckCheck className="size-3.5 text-green-600" aria-label="Przeczytano" />
            ) : (
              <Check className="size-3.5" aria-label="Wysłano" />
            ))}
        </div>
      </div>
    </div>
  );
}
