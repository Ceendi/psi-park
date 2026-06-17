import { useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { Button, Textarea } from '@/shared/ui';

/** Message input — Enter sends, Shift+Enter newlines; emits typing signals. */
export function MessageComposer({
  onSend,
  onTyping,
  disabled,
}: {
  onSend: (content: string) => void;
  onTyping: (state: boolean) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState('');
  const typingRef = useRef(false);
  const stopTimer = useRef<number | null>(null);

  function signalTyping() {
    if (!typingRef.current) {
      typingRef.current = true;
      onTyping(true);
    }
    if (stopTimer.current) window.clearTimeout(stopTimer.current);
    stopTimer.current = window.setTimeout(() => {
      typingRef.current = false;
      onTyping(false);
    }, 2000);
  }

  function submit() {
    const content = value.trim();
    if (!content) return;
    onSend(content);
    setValue('');
    if (stopTimer.current) window.clearTimeout(stopTimer.current);
    typingRef.current = false;
    onTyping(false);
  }

  return (
    <div className="flex items-end gap-2 border-t border-ink-100 p-3">
      <Textarea
        rows={1}
        value={value}
        disabled={disabled}
        aria-label="Napisz wiadomość"
        placeholder="Napisz wiadomość…"
        className="max-h-32 min-h-[2.75rem] flex-1 resize-none py-3"
        onChange={(e) => {
          setValue(e.target.value);
          signalTyping();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <Button
        aria-label="Wyślij"
        disabled={disabled || value.trim() === ''}
        onClick={submit}
        className="shrink-0"
      >
        <Send className="size-4" />
      </Button>
    </div>
  );
}
