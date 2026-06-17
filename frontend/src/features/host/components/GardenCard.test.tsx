import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Garden } from '@/shared/api/types';
import { GardenCard } from './GardenCard';

function makeGarden(overrides: Partial<Garden> = {}): Garden {
  return {
    id: 3,
    title: 'Ogród z basenem',
    description: 'Opis',
    city: 'Kraków',
    address: 'Wola Justowska',
    latitude: '50.061400',
    longitude: '19.937200',
    area_m2: 480,
    surface_type: 'grass',
    is_fenced: true,
    fence_height_m: '1.8',
    max_dogs: 3,
    price_per_hour: '45.00',
    open_from: '08:00:00',
    open_to: '20:00:00',
    min_booking_hours: 1,
    amenities: ['pool'],
    amenities_display: [],
    rules: [],
    verification_status: 'approved',
    rejection_reason: '',
    is_active: true,
    host: { id: 1, full_name: 'Magda Krawczyk', is_verified_host: true },
    photos: [],
    rating_avg: 4.92,
    rating_count: 12,
    created_at: '2026-01-01T10:00:00+01:00',
    updated_at: '2026-01-01T10:00:00+01:00',
    ...overrides,
  } as Garden;
}

const handlers = { onEdit: vi.fn(), onDelete: vi.fn(), onToggleActive: vi.fn(), onView: vi.fn() };

describe('GardenCard', () => {
  it('shows an active garden with rating and the activity toggle', () => {
    render(<GardenCard garden={makeGarden()} {...handlers} />);
    expect(screen.getByRole('heading', { name: 'Ogród z basenem' })).toBeInTheDocument();
    expect(screen.getByText('Aktywny')).toBeInTheDocument();
    expect(screen.getByText('4,92')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('surfaces the rejection reason for a rejected garden', () => {
    render(
      <GardenCard
        garden={makeGarden({ verification_status: 'rejected', rejection_reason: 'Za mało zdjęć' })}
        {...handlers}
      />,
    );
    expect(screen.getByText('Odrzucony')).toBeInTheDocument();
    expect(screen.getByText(/Za mało zdjęć/)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('fires edit, delete and toggle callbacks', async () => {
    render(<GardenCard garden={makeGarden()} {...handlers} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edytuj' }));
    expect(handlers.onEdit).toHaveBeenCalledWith(3);
    await userEvent.click(screen.getByRole('button', { name: 'Usuń ofertę' }));
    expect(handlers.onDelete).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('switch'));
    expect(handlers.onToggleActive).toHaveBeenCalledWith(3, false);
  });
});
