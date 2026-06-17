import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAccessToken } from '@/shared/auth';
import { createChatSocket, sendChatFrame } from '@/shared/lib/ws';
import type { ChatServerFrame } from '@/shared/lib/ws';
import type { ChatMessage } from '@/shared/api/types';
import { chatKeys, fetchMessages, useMarkRead } from './api';

export type SocketStatus = 'connecting' | 'open' | 'closed';

export interface UseChatSocket {
  messages: ChatMessage[];
  status: SocketStatus;
  loadingHistory: boolean;
  hasMore: boolean;
  loadingOlder: boolean;
  loadOlder: () => void;
  typingFromOther: boolean;
  sendMessage: (content: string) => void;
  notifyTyping: (state: boolean) => void;
}

const RECONNECT_DELAY_MS = 1500;
const TYPING_TIMEOUT_MS = 4000;

/**
 * Live chat for one conversation (PLAN §9): REST seeds the history, the WebSocket
 * streams `message.new` / `typing` / `read`, and a dropped socket auto-reconnects
 * and refetches history. The current user's id (`meId`) disambiguates own bubbles
 * and read receipts.
 */
export function useChatSocket(conversationId: number | null, meId: number | undefined): UseChatSocket {
  const qc = useQueryClient();
  const markRead = useMarkRead();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [typingFromOther, setTypingFromOther] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const closedByUsRef = useRef(false);

  const markReadMutate = markRead.mutate;
  const markReadIfNeeded = useCallback(
    (incomingMessages: ChatMessage[]) => {
      if (conversationId == null || meId == null) return;
      const hasUnreadFromOther = incomingMessages.some((m) => m.sender !== meId && !m.read_at);
      if (hasUnreadFromOther) {
        markReadMutate(conversationId);
        const socket = socketRef.current;
        if (socket) sendChatFrame(socket, { type: 'read' });
      }
    },
    [conversationId, meId, markReadMutate],
  );

  // Load the most recent page of history (used on mount and after a reconnect).
  const loadInitial = useCallback(async () => {
    if (conversationId == null) return;
    setLoadingHistory(true);
    try {
      const page = await fetchMessages(conversationId);
      const ascending = [...page.results].reverse();
      setMessages(ascending);
      setHasMore(page.has_more);
      setNextBefore(page.next_before);
      markReadIfNeeded(ascending);
    } finally {
      setLoadingHistory(false);
    }
  }, [conversationId, markReadIfNeeded]);

  const loadOlder = useCallback(async () => {
    if (conversationId == null || !hasMore || nextBefore == null || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await fetchMessages(conversationId, nextBefore);
      const olderAscending = [...page.results].reverse();
      setMessages((current) => [...olderAscending, ...current]);
      setHasMore(page.has_more);
      setNextBefore(page.next_before);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, hasMore, nextBefore, loadingOlder]);

  const handleFrame = useCallback(
    (frame: ChatServerFrame) => {
      if (frame.type === 'message.new') {
        const incoming: ChatMessage = {
          id: frame.message.id,
          conversation: conversationId ?? 0,
          sender: frame.message.sender,
          content: frame.message.content,
          created_at: frame.message.created_at,
          read_at: null,
        };
        setMessages((current) =>
          current.some((m) => m.id === incoming.id) ? current : [...current, incoming],
        );
        if (incoming.sender !== meId) markReadIfNeeded([incoming]);
        // Refresh the list preview/badge for the other party's threads.
        qc.invalidateQueries({ queryKey: chatKeys.conversations });
      } else if (frame.type === 'typing') {
        if (frame.user !== meId) {
          setTypingFromOther(frame.state);
          if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
          if (frame.state) {
            typingTimerRef.current = window.setTimeout(() => setTypingFromOther(false), TYPING_TIMEOUT_MS);
          }
        }
      } else if (frame.type === 'read') {
        if (frame.user !== meId) {
          setMessages((current) =>
            current.map((m) => (m.sender === meId && !m.read_at ? { ...m, read_at: frame.at } : m)),
          );
        }
      }
    },
    [conversationId, meId, markReadIfNeeded, qc],
  );

  useEffect(() => {
    if (conversationId == null) return;
    closedByUsRef.current = false;
    let cancelled = false;

    void loadInitial();

    function connect() {
      const token = getAccessToken();
      if (!token || cancelled) {
        setStatus('closed');
        return;
      }
      setStatus('connecting');
      const socket = createChatSocket(conversationId as number, token, {
        onOpen: () => {
          if (!cancelled) setStatus('open');
        },
        onFrame: handleFrame,
        onClose: () => {
          if (cancelled || closedByUsRef.current) return;
          setStatus('closed');
          // Auto-reconnect, then refetch history to catch anything missed.
          reconnectRef.current = window.setTimeout(() => {
            void loadInitial();
            connect();
          }, RECONNECT_DELAY_MS);
        },
      });
      socketRef.current = socket;
    }

    connect();

    return () => {
      cancelled = true;
      closedByUsRef.current = true;
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [conversationId, handleFrame, loadInitial]);

  const sendMessage = useCallback((content: string) => {
    const socket = socketRef.current;
    if (socket) sendChatFrame(socket, { type: 'message.send', content });
  }, []);

  const notifyTyping = useCallback((state: boolean) => {
    const socket = socketRef.current;
    if (socket) sendChatFrame(socket, { type: 'typing', state });
  }, []);

  return {
    messages,
    status,
    loadingHistory,
    hasMore,
    loadingOlder,
    loadOlder,
    typingFromOther,
    sendMessage,
    notifyTyping,
  };
}
