import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Garden } from '@/shared/api/types';
import { OrderSummary } from './OrderSummary';

const garden = { title: 'Ogród z basenem', city: 'Kraków', price_per_hour: '45.00', photos: [] } as unknown as Garden;

describe('OrderSummary', () => {
  it('renders the live quote (subtotal, 10% fee, total)', () => {
    render(
      <OrderSummary
        garden={garden}
        selection={{ date: '2026-05-24', start: '15:00', end: '17:00', dogName: 'Łata', dogsCount: 1 }}
      />,
    );
    expect(screen.getByText('Ogród z basenem')).toBeInTheDocument();
    expect(screen.getByText('Łata')).toBeInTheDocument();
    expect(screen.getByText(/15:00–17:00/)).toBeInTheDocument();
    expect(screen.getByText('Opłata serwisowa')).toBeInTheDocument();
    expect(screen.getByText(/90\s*zł/)).toBeInTheDocument(); // subtotal 45 × 2
    expect(screen.getByText(/99\s*zł/)).toBeInTheDocument(); // total incl. 10% fee
  });

  it('prompts for missing selection', () => {
    render(
      <OrderSummary garden={garden} selection={{ date: '', start: '', end: '', dogsCount: 1 }} />,
    );
    expect(screen.getByText('Wybierz datę')).toBeInTheDocument();
    expect(screen.getByText('Wybierz godziny')).toBeInTheDocument();
  });
});
