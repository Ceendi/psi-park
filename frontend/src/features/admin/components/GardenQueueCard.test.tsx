import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AdminGarden } from '@/shared/api/types';
import { GardenQueueCard } from './GardenQueueCard';

vi.mock('@/shared/ui/MapView', () => ({ MapView: () => <div data-testid="map" /> }));

function makeGarden(overrides: Partial<AdminGarden> = {}): AdminGarden {
  return {
    id: 5,
    title: 'Sad jabłoniowy',
    description: 'Spokojny, ogrodzony teren.',
    city: 'Kraków',
    address: 'Bronowice',
    latitude: '50.080000',
    longitude: '19.870000',
    area_m2: 900,
    surface_type: 'grass',
    is_fenced: true,
    fence_height_m: '1.8',
    max_dogs: 3,
    price_per_hour: '30.00',
    open_from: '08:00:00',
    open_to: '20:00:00',
    min_booking_hours: 1,
    amenities: ['pool'],
    amenities_display: [{ code: 'pool', label: 'Basen dla psów' }],
    rules: ['Sprzątanie po psie'],
    verification_status: 'pending',
    rejection_reason: '',
    is_active: true,
    host: { id: 1, full_name: 'Magda Krawczyk', email: 'magda@psipark.pl', phone: '600100200', role: 'host', is_verified_host: true, verified_at: null },
    photos: [],
    rating_avg: null,
    rating_count: 0,
    created_at: '2026-06-01T10:00:00+02:00',
    updated_at: '2026-06-01T10:00:00+02:00',
    ...overrides,
  } as AdminGarden;
}

const handlers = { onApprove: vi.fn(), onReject: vi.fn() };

describe('GardenQueueCard', () => {
  it('renders the garden, host contact and pending actions', () => {
    render(<GardenQueueCard garden={makeGarden()} {...handlers} />);
    expect(screen.getByRole('heading', { name: 'Sad jabłoniowy' })).toBeInTheDocument();
    expect(screen.getByText('magda@psipark.pl')).toBeInTheDocument();
    expect(screen.getByText('Basen dla psów')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zatwierdź/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Odrzuć/ })).toBeInTheDocument();
  });

  it('fires approve/reject callbacks', async () => {
    render(<GardenQueueCard garden={makeGarden()} {...handlers} />);
    await userEvent.click(screen.getByRole('button', { name: /Zatwierdź/ }));
    expect(handlers.onApprove).toHaveBeenCalledWith(5);
    await userEvent.click(screen.getByRole('button', { name: /Odrzuć/ }));
    expect(handlers.onReject).toHaveBeenCalled();
  });

  it('hides actions and shows the reason for a rejected garden', () => {
    render(
      <GardenQueueCard
        garden={makeGarden({ verification_status: 'rejected', rejection_reason: 'Za mało zdjęć' })}
        {...handlers}
      />,
    );
    expect(screen.getByText(/Za mało zdjęć/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Zatwierdź/ })).not.toBeInTheDocument();
  });
});
