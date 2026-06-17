import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { GardenListItem } from '@/shared/api/types';
import { GardenCard } from './GardenCard';

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const garden: GardenListItem = {
  id: 1,
  title: 'Ogród z basenem',
  city: 'Kraków',
  address: 'Wola Justowska',
  latitude: '50.06',
  longitude: '19.93',
  area_m2: 480,
  surface_type: 'grass',
  max_dogs: 3,
  price_per_hour: '45.00',
  cover_image: null,
  rating_avg: 4.92,
  rating_count: 128,
};

function renderCard(props: Partial<Parameters<typeof GardenCard>[0]> = {}) {
  render(
    <MemoryRouter>
      <GardenCard garden={garden} saved={false} onToggleSave={vi.fn()} {...props} />
    </MemoryRouter>,
  );
}

describe('GardenCard', () => {
  it('shows title, price, rating and meta', () => {
    renderCard();
    expect(screen.getByRole('heading', { name: 'Ogród z basenem' })).toBeInTheDocument();
    expect(screen.getByText('45 zł / h')).toBeInTheDocument();
    expect(screen.getByText('4,92')).toBeInTheDocument();
    expect(screen.getByText('(128)')).toBeInTheDocument();
    expect(screen.getByText('480 m²')).toBeInTheDocument();
    expect(screen.getByText('do 3 psów')).toBeInTheDocument();
  });

  it('toggles save without navigating', async () => {
    const onToggleSave = vi.fn();
    renderCard({ onToggleSave });
    await userEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
    expect(onToggleSave).toHaveBeenCalledWith(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to the detail page on card click', async () => {
    renderCard();
    await userEvent.click(screen.getByRole('heading', { name: 'Ogród z basenem' }));
    expect(mockNavigate).toHaveBeenCalledWith('/ogrody/1');
  });
});
