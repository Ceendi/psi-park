import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DogListItem, Garden } from '@/shared/api/types';
import { Step1Details } from './Step1Details';

const garden = { id: 1, title: 'Ogród', price_per_hour: '45.00', max_dogs: 3 } as unknown as Garden;
const dog = { id: 7, name: 'Łata', breed: 'Mieszaniec', vaccinations_status: 'valid' } as unknown as DogListItem;

function baseProps(overrides = {}) {
  return {
    garden,
    dogs: [dog],
    dogsLoading: false,
    date: new Date('2026-05-24'),
    onDate: vi.fn(),
    range: { start: '15:00', end: '17:00' },
    onRange: vi.fn(),
    slots: [
      { hour: '15:00', available: true },
      { hour: '16:00', available: true },
    ],
    slotsLoading: false,
    dogId: 7,
    onDog: vi.fn(),
    message: '',
    onMessage: vi.fn(),
    onAddDog: vi.fn(),
    onProceed: vi.fn(),
    proceeding: false,
    error: null,
    ...overrides,
  };
}

describe('Step1Details', () => {
  it('keeps "Przejdź do płatności" disabled until the 3 required consents are checked', async () => {
    const onProceed = vi.fn();
    render(<Step1Details {...baseProps({ onProceed })} />);
    const cta = screen.getByRole('button', { name: 'Przejdź do płatności' });
    expect(cta).toBeDisabled();

    await userEvent.click(screen.getByRole('checkbox', { name: /Regulamin/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Politykę prywatności/ }));
    expect(cta).toBeDisabled(); // health consent still missing

    await userEvent.click(screen.getByRole('checkbox', { name: /zdrowy i ma aktualne szczepienia/ }));
    expect(cta).toBeEnabled();
    await userEvent.click(cta);
    expect(onProceed).toHaveBeenCalled();
  });

  it('stays disabled without a selected dog even with consents', async () => {
    render(<Step1Details {...baseProps({ dogId: null })} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Regulamin/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Politykę prywatności/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /zdrowy i ma aktualne szczepienia/ }));
    expect(screen.getByRole('button', { name: 'Przejdź do płatności' })).toBeDisabled();
  });
});
