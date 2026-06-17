import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Conversation } from '@/shared/api/types';
import { ConversationList } from './ConversationList';

function conv(overrides: Partial<Conversation>): Conversation {
  return {
    id: 1,
    garden: { id: 3, title: 'Ogród z basenem', city: 'Kraków', cover_image: null },
    client: { id: 9, full_name: 'Katarzyna Nowak' },
    host: { id: 1, full_name: 'Magda Krawczyk' },
    unread_count: 0,
    last_message: { content: 'Do zobaczenia!', sender: 1, created_at: '2026-05-20T10:00:00+02:00' },
    last_message_at: '2026-05-20T10:00:00+02:00',
    created_at: '2026-05-01T10:00:00+02:00',
    ...overrides,
  };
}

const conversations = [
  conv({ id: 1, unread_count: 2 }),
  conv({
    id: 2,
    host: { id: 4, full_name: 'Tomek Wójcik' },
    unread_count: 0,
    last_message: { content: 'Dziękuję', sender: 9, created_at: '2026-05-19T09:00:00+02:00' },
  }),
];

describe('ConversationList', () => {
  it('renders rows with counterpart name, preview and unread badge', () => {
    render(
      <ConversationList conversations={conversations} meId={9} activeId={null} loading={false} onSelect={vi.fn()} />,
    );
    expect(screen.getByText('Magda Krawczyk')).toBeInTheDocument();
    expect(screen.getByText('Tomek Wójcik')).toBeInTheDocument();
    expect(screen.getByText('Do zobaczenia!')).toBeInTheDocument();
    // Unread badge lives on Magda's row (id 1, unread_count 2).
    const row = screen.getByText('Magda Krawczyk').closest('button')!;
    expect(within(row).getByText('2')).toBeInTheDocument();
  });

  it('selects a conversation on click', async () => {
    const onSelect = vi.fn();
    render(
      <ConversationList conversations={conversations} meId={9} activeId={null} loading={false} onSelect={onSelect} />,
    );
    await userEvent.click(screen.getByText('Magda Krawczyk'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('filters to unread only', async () => {
    render(
      <ConversationList conversations={conversations} meId={9} activeId={null} loading={false} onSelect={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole('tab', { name: /Nieprzeczytane/ }));
    expect(screen.getByText('Magda Krawczyk')).toBeInTheDocument();
    expect(screen.queryByText('Tomek Wójcik')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no conversations', () => {
    render(<ConversationList conversations={[]} meId={9} activeId={null} loading={false} onSelect={vi.fn()} />);
    expect(screen.getByText(/Nie masz jeszcze żadnych rozmów/)).toBeInTheDocument();
  });
});
