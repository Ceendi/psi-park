/**
 * Booking-widget price preview (PLAN F3). The authoritative amounts are computed
 * server-side on `POST /reservations/` (F4) — this is a live estimate for the UI,
 * so the platform fee is a documented FE constant (PLAN §6.2 default 10%).
 */
export const PLATFORM_FEE_PERCENT = 10;

export interface Quote {
  hours: number;
  subtotal: number;
  serviceFee: number;
  total: number;
}

/** Whole hours between two "HH:00" labels (end exclusive). */
export function hoursBetween(start: string, end: string): number {
  const s = Number.parseInt(start.slice(0, 2), 10);
  const e = Number.parseInt(end.slice(0, 2), 10);
  return Math.max(0, e - s);
}

/** Live cost preview: subtotal = rate × hours, fee = PLATFORM_FEE_PERCENT%. */
export function computeQuote(pricePerHour: string | number, hours: number): Quote {
  const rate = typeof pricePerHour === 'string' ? Number.parseFloat(pricePerHour) : pricePerHour;
  const subtotal = Number.isFinite(rate) ? rate * hours : 0;
  const serviceFee = Math.round(subtotal * PLATFORM_FEE_PERCENT) / 100;
  return { hours, subtotal, serviceFee, total: subtotal + serviceFee };
}
