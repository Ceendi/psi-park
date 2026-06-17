import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EMPTY_FILTERS } from '../filters';
import { FiltersBar } from './FiltersBar';

const onChange = vi.fn();
const onOpenAllFilters = vi.fn();

function renderBar(value = EMPTY_FILTERS) {
  render(
    <FiltersBar value={value} onChange={onChange} availableCities={['Kraków', 'Warszawa']} onOpenAllFilters={onOpenAllFilters} />,
  );
}

beforeEach(() => {
  onChange.mockReset();
  onOpenAllFilters.mockReset();
});

describe('FiltersBar', () => {
  it('increments the dog count', async () => {
    renderBar();
    await userEvent.click(screen.getByRole('button', { name: 'Więcej psów' }));
    expect(onChange).toHaveBeenCalledWith({ dogs: 2 });
  });

  it('toggles the fenced amenity', async () => {
    renderBar();
    await userEvent.click(screen.getByRole('button', { name: 'Pełne ogrodzenie' }));
    expect(onChange).toHaveBeenCalledWith({ amenities: ['fenced_secure'] });
  });

  it('commits the city on Enter', async () => {
    renderBar();
    const input = screen.getByLabelText('Miasto');
    await userEvent.type(input, 'Gdańsk{Enter}');
    expect(onChange).toHaveBeenCalledWith({ city: 'Gdańsk' });
  });

  it('opens the all-filters modal and shows the active count', async () => {
    renderBar({ ...EMPTY_FILTERS, maxPrice: '80', surface: 'grass' });
    expect(screen.getByText('2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Wszystkie filtry/ }));
    expect(onOpenAllFilters).toHaveBeenCalled();
  });
});
