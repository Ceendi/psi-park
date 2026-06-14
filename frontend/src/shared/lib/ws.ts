/**
 * Chat WebSocket factory (PLAN §9, §16.3). The live message stream lives in
 * part F7; F0 only provides the typed socket factory so every consumer connects
 * the same way: `ws(s)://<host>/ws/chat/{id}/?token=<access_jwt>`.
 */

export interface ChatMessagePayload {
  id: number;
  sender: number;
  content: string;
  created_at: string;
}

/** Server → client frames broadcast within the conversation group (PLAN §9.2). */
export type ChatServerFrame =
  | { type: 'message.new'; message: ChatMessagePayload }
  | { type: 'typing'; user: number; state: boolean }
  | { type: 'read'; user: number; at: string };

/** Client → server frames (PLAN §9.2). */
export type ChatClientFrame =
  | { type: 'message.send'; content: string }
  | { type: 'typing'; state: boolean }
  | { type: 'read' };

export interface ChatSocketHandlers {
  onFrame?: (frame: ChatServerFrame) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

function buildChatUrl(conversationId: number | string, token: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/chat/${conversationId}/?token=${encodeURIComponent(
    token,
  )}`;
}

/**
 * Open a chat socket and wire JSON frame parsing. Returns the raw `WebSocket`
 * so callers own its lifecycle (close on unmount, reconnect, etc.).
 */
export function createChatSocket(
  conversationId: number | string,
  token: string,
  handlers: ChatSocketHandlers = {},
): WebSocket {
  const socket = new WebSocket(buildChatUrl(conversationId, token));

  if (handlers.onOpen) socket.addEventListener('open', handlers.onOpen);
  if (handlers.onClose) socket.addEventListener('close', handlers.onClose);
  if (handlers.onError) socket.addEventListener('error', handlers.onError);

  if (handlers.onFrame) {
    socket.addEventListener('message', (event: MessageEvent<string>) => {
      try {
        handlers.onFrame?.(JSON.parse(event.data) as ChatServerFrame);
      } catch {
        // Ignore malformed frames rather than crashing the stream.
      }
    });
  }

  return socket;
}

/** Type-safe send helper for client → server frames. */
export function sendChatFrame(socket: WebSocket, frame: ChatClientFrame): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(frame));
  }
}
