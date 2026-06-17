import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DogListItem } from '@/shared/api/types';
import { DogCard } from './DogCard';

const dog: DogListItem = {
  id: 7,
  name: 'Łata',
  breed: 'Mieszaniec',
  age_label: '4 lata',
  weight_kg: '18.0',
  sex: 'female',
  is_sterilized: true,
  vaccinations_status: 'valid',
  deworming_status: 'expired',
  health_status: 'expired',
  photo: null,
};

function noop() {}

describe('DogCard', () => {
  it('renders the dog identity and metadata', () => {
    render(<DogCard dog={dog} onEdit={noop} onDelete={noop} onAddPhoto={noop} />);
    expect(screen.getByRole('heading', { name: 'Łata' })).toBeInTheDocument();
    expect(screen.getByText(/Mieszaniec · 18.0 kg · suka, sterylizowana/)).toBeInTheDocument();
    expect(screen.getByText('4 lata')).toBeInTheDocument();
    expect(screen.getByText('Aktywny')).toBeInTheDocument();
  });

  it('shows a status word for each health row', () => {
    render(<DogCard dog={dog} onEdit={noop} onDelete={noop} onAddPhoto={noop} />);
    expect(screen.getByText('Szczepienia')).toBeInTheDocument();
    expect(screen.getAllByText('Przeterminowane').length).toBeGreaterThan(0);
    expect(screen.getByText('Aktualne')).toBeInTheDocument();
  });

  it('fires edit and delete callbacks', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<DogCard dog={dog} onEdit={onEdit} onDelete={onDelete} onAddPhoto={noop} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edytuj profil' }));
    expect(onEdit).toHaveBeenCalledWith(7);
    await userEvent.click(screen.getByRole('button', { name: /Usuń/ }));
    expect(onDelete).toHaveBeenCalledWith(dog);
  });
});
