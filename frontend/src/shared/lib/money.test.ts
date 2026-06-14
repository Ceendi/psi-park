import { describe, it, expect } from 'vitest';
import { formatPLN } from './money';

const NBSP = ' ';

describe('formatPLN', () => {
  it('formats whole złoty without decimals', () => {
    expect(formatPLN(45)).toBe(`45${NBSP}zł`);
    expect(formatPLN(99)).toBe(`99${NBSP}zł`);
  });

  it('drops a .00 fraction from Decimal strings (the backend wire format)', () => {
    expect(formatPLN('45.00')).toBe(`45${NBSP}zł`);
    expect(formatPLN('90.00')).toBe(`90${NBSP}zł`);
  });

  it('shows two decimals when the amount is fractional', () => {
    expect(formatPLN(89.5)).toBe(`89,50${NBSP}zł`);
    expect(formatPLN('9.90')).toBe(`9,90${NBSP}zł`);
  });

  it('groups thousands with a non-breaking space', () => {
    expect(formatPLN(1847)).toBe(`1${NBSP}847${NBSP}zł`);
    expect(formatPLN(1234567)).toBe(`1${NBSP}234${NBSP}567${NBSP}zł`);
  });

  it('can omit the currency suffix', () => {
    expect(formatPLN(90, { suffix: false })).toBe('90');
    expect(formatPLN(89.5, { suffix: false })).toBe('89,50');
  });

  it('can force a fixed number of decimals', () => {
    expect(formatPLN(45, { decimals: 2 })).toBe(`45,00${NBSP}zł`);
  });

  it('renders a placeholder for non-finite input', () => {
    expect(formatPLN(Number.NaN)).toBe(`—${NBSP}zł`);
    expect(formatPLN('not-a-number')).toBe(`—${NBSP}zł`);
  });

  it('handles negative amounts', () => {
    expect(formatPLN(-1234.5)).toBe(`-1${NBSP}234,50${NBSP}zł`);
  });
});
