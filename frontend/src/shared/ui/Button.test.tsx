import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders its label as a button', () => {
    render(<Button>Zarezerwuj</Button>);
    expect(screen.getByRole('button', { name: 'Zarezerwuj' })).toBeInTheDocument();
  });

  it('fires onClick when pressed', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Dalej</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled and marked busy while loading', () => {
    render(<Button loading>Zapłać</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Usuń
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies the chosen variant', () => {
    render(<Button variant="primary">A</Button>);
    expect(screen.getByRole('button').className).toContain('bg-green-700');
  });

  it('gives outline variants a visible border color (no transparent leak)', () => {
    render(
      <>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger">Danger</Button>
      </>,
    );
    const [secondary, danger] = screen.getAllByRole('button');
    // The variant's outline color is present...
    expect(secondary.className).toContain('border-ink-200');
    expect(danger.className).toContain('border-[color-mix');
    // ...and BASE no longer leaks a `border-transparent` that would override it.
    expect(secondary.className).not.toContain('border-transparent');
    expect(danger.className).not.toContain('border-transparent');
  });

  it('keeps borderless variants explicitly transparent', () => {
    render(
      <>
        <Button variant="primary">Primary</Button>
        <Button variant="ghost">Ghost</Button>
      </>,
    );
    const [primary, ghost] = screen.getAllByRole('button');
    expect(primary.className).toContain('border-transparent');
    expect(ghost.className).toContain('border-transparent');
  });
});
