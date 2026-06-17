import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { ChatMessage, Conversation } from '@/shared/api/types';
import { MessageThread } from './MessageThread';

const sendMessage = vi.fn();
const notifyTyping = vi.fn();
let socketState: {
  messages: ChatMessage[];
  typingFromOther: boolean;
  status: string;
};

vi.mock('../useChatSocket', () => ({
  useChatSocket: () => ({
    messages: socketState.messages,
    status: socketState.status,
    loadingHistory: false,
    hasMore: false,
    loadingOlder: false,
    loadOlder: vi.fn(),
    typingFromOther: socketState.typingFromOther,
    sendMessage,
    notifyTyping,
  }),
}));

function msg(id: number, sender: number, content: string): ChatMessage {
  return {
    id,
    conversation: 1,
    sender,
    content,
    read_at: null,
    created_at: '2026-05-20T10:00:00+02:00',
  };
}

const conversation: Conversation = {
  id: 1,
  garden: { id: 3, title: 'Ogród z basenem', city: 'Kraków', cover_image: null },
  client: { id: 9, full_name: 'Katarzyna Nowak' },
  host: { id: 1, full_name: 'Magda Krawczyk' },
  unread_count: 0,
  last_message: null,
  last_message_at: null,
  created_at: '2026-05-01T10:00:00+02:00',
};

function renderThread(meId = 9) {
  render(
    <MemoryRouter>
      <MessageThread conversation={conversation} meId={meId} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  sendMessage.mockReset();
  notifyTyping.mockReset();
  socketState = {
    messages: [msg(1, 1, 'Dzień dobry!'), msg(2, 9, 'Cześć, do zobaczenia')],
    typingFromOther: false,
    status: 'open',
  };
});

describe('MessageThread', () => {
  it('renders the counterpart header and both bubbles', () => {
    renderThread();
    expect(screen.getByText('Magda Krawczyk')).toBeInTheDocument();
    expect(screen.getByText('Ogród z basenem · Kraków')).toBeInTheDocument();
    expect(screen.getByText('Dzień dobry!')).toBeInTheDocument();
    expect(screen.getByText('Cześć, do zobaczenia')).toBeInTheDocument();
  });

  it('sends a message on Enter via the socket', async () => {
    renderThread();
    const input = screen.getByLabelText('Napisz wiadomość');
    await userEvent.type(input, 'Nowa wiadomość{Enter}');
    expect(sendMessage).toHaveBeenCalledWith('Nowa wiadomość');
  });

  it('shows the typing indicator', () => {
    socketState.typingFromOther = true;
    renderThread();
    expect(screen.getByText('Magda Krawczyk pisze…')).toBeInTheDocument();
  });
});
