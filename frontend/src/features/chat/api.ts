import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { Conversation, MessageHistory, Paginated } from '@/shared/api/types';

/**
 * Chat data layer (PLAN §8.2 — REST serves history + state; the live stream is WS,
 * §9). The conversation list polls on an interval as the unread-badge fallback
 * (PLAN F7: "jeśli WS padnie, REST polling").
 */

/** Shape of `Conversation.last_message` (typed loosely as `object` in the schema). */
export interface LastMessage {
  content: string;
  sender: number | null;
  created_at: string | null;
}

export const chatKeys = {
  conversations: ['chat', 'conversations'] as const,
};

export function useConversations() {
  return useQuery({
    queryKey: chatKeys.conversations,
    queryFn: async () => {
      const { data } = await api.get<Paginated<Conversation>>('conversations/', {
        params: { page_size: 100 },
      });
      return data.results;
    },
    // Fallback badge refresh when no socket is open on this conversation.
    refetchInterval: 20_000,
  });
}

/** Fetch a keyset page of history, newest-first (PLAN §8.2). */
export async function fetchMessages(
  conversationId: number,
  before?: number | null,
): Promise<MessageHistory> {
  const { data } = await api.get<MessageHistory>(`conversations/${conversationId}/messages/`, {
    params: { before: before ?? undefined },
  });
  return data;
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: number) => {
      await api.post(`conversations/${conversationId}/read/`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chatKeys.conversations }),
  });
}
