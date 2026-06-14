import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './FormField';
import { Input } from './Input';

describe('FormField', () => {
  it('associates the label with the control', () => {
    render(
      <FormField label="E-mail" htmlFor="email">
        <Input id="email" type="email" />
      </FormField>,
    );
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
  });

  it('shows the error in place of the hint and flags the field invalid', () => {
    render(
      <FormField label="E-mail" htmlFor="email" hint="Twój adres" error="Adres jest niepoprawny.">
        <Input id="email" type="email" invalid />
      </FormField>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Adres jest niepoprawny.');
    expect(screen.queryByText('Twój adres')).not.toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
  });
});
