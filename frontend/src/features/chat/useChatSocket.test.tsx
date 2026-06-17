import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ChatServerFrame, ChatSocketHandlers } from '@/shared/lib/ws';
import { useChatSocket } from './useChatSocket';

const h = vi.hoisted(() => ({
  handlers: { current: null as ChatSocketHandlers | null },
  socket: { close: vi.fn(), readyState: 1 },
  sendSpy: vi.fn(),
  fetchSpy: vi.fn(),
  markRead: vi.fn(),
}));

vi.mock('@/shared/lib/ws', () => ({
  createChatSocket: (_id: number, _token: string, handlers: ChatSocketHandlers) => {
    h.handlers.current = handlers;
    handlers.onOpen?.();
    return h.socket;
  },
  sendChatFrame: h.sendSpy,
}));

vi.mock('@/shared/auth', () => ({ getAccessToken: () => 'access-token' }));

vi.mock('./api', () => ({
  chatKeys: { conversations: ['chat', 'conversations'] },
  fetchMessages: h.fetchSpy,
  useMarkRead: () => ({ mutate: h.markRead }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  h.sendSpy.mockReset();
  h.markRead.mockReset();
  h.handlers.current = null;
  h.fetchSpy.mockResolvedValue({
    results: [
      { id: 2, conversation: 1, sender: 9, content: 'Druga', read_at: null, created_at: '2026-05-20T10:01:00+02:00' },
      { id: 1, conversation: 1, sender: 1, content: 'Pierwsza', read_at: null, created_at: '2026-05-20T10:00:00+02:00' },
    ],
    has_more: false,
    next_before: null,
  });
});

describe('useChatSocket', () => {
  it('loads history newest-last and connects', async () => {
    const { result } = renderHook(() => useChatSocket(1, 9), { wrapper });
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.messages[0].content).toBe('Pierwsza'); // ascending order
    expect(result.current.status).toBe('open');
    // The first page contained an unread message from the other party.
    expect(h.markRead).toHaveBeenCalledWith(1);
  });

  it('appends an incoming message.new frame', async () => {
    const { result } = renderHook(() => useChatSocket(1, 9), { wrapper });
    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    const frame: ChatServerFrame = {
      type: 'message.new',
      message: { id: 3, sender: 1, content: 'Trzecia', created_at: '2026-05-20T10:02:00+02:00' },
    };
    act(() => h.handlers.current?.onFrame?.(frame));
    expect(result.current.messages.map((m) => m.content)).toContain('Trzecia');
  });

  it('sends a message over the socket', async () => {
    const { result } = renderHook(() => useChatSocket(1, 9), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('open'));
    act(() => result.current.sendMessage('Hej'));
    expect(h.sendSpy).toHaveBeenCalledWith(h.socket, { type: 'message.send', content: 'Hej' });
  });
});
