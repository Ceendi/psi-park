import { describe, it, expect } from 'vitest';
import { computeQuote, hoursBetween, PLATFORM_FEE_PERCENT } from './booking';

describe('booking quote', () => {
  it('counts whole hours between HH:00 labels', () => {
    expect(hoursBetween('15:00', '17:00')).toBe(2);
    expect(hoursBetween('09:00', '10:00')).toBe(1);
    expect(hoursBetween('17:00', '15:00')).toBe(0);
  });

  it('computes subtotal, 10% service fee and total', () => {
    expect(PLATFORM_FEE_PERCENT).toBe(10);
    const q = computeQuote('45.00', 2);
    expect(q.subtotal).toBe(90);
    expect(q.serviceFee).toBe(9);
    expect(q.total).toBe(99);
  });

  it('handles fractional fees to the cent', () => {
    const q = computeQuote('45', 1);
    expect(q.subtotal).toBe(45);
    expect(q.serviceFee).toBe(4.5);
    expect(q.total).toBe(49.5);
  });

  it('is zero for an empty range', () => {
    expect(computeQuote('45', 0)).toEqual({ hours: 0, subtotal: 0, serviceFee: 0, total: 0 });
  });
});
