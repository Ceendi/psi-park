import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders its content', () => {
    render(<Badge variant="success">Potwierdzona</Badge>);
    expect(screen.getByText('Potwierdzona')).toBeInTheDocument();
  });

  it('applies variant styling', () => {
    const { container } = render(<Badge variant="danger">Anulowana</Badge>);
    expect(container.firstChild).toHaveClass('bg-danger-soft');
  });
});
