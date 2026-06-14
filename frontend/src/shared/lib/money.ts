/**
 * Money formatting (PLAN §10 / §6.5). The backend stores and returns money as
 * `Decimal` strings (e.g. "90.00"); the frontend never does arithmetic on
 * money — it only formats for display. `formatPLN(89.5) → "89,50 zł"`.
 *
 * Polish convention: comma decimal separator, non-breaking space as the
 * thousands separator and before the currency suffix (so amounts never wrap).
 */

const NBSP = ' ';

export interface FormatPLNOptions {
  /** Number of decimal places, or `'auto'` (default): 0 for whole złoty, else 2. */
  decimals?: number | 'auto';
  /** Append the `zł` suffix (default `true`). */
  suffix?: boolean;
}

export function formatPLN(value: number | string, options: FormatPLNOptions = {}): string {
  const { decimals = 'auto', suffix = true } = options;
  const n = typeof value === 'string' ? Number.parseFloat(value) : value;

  if (!Number.isFinite(n)) {
    return suffix ? `—${NBSP}zł` : '—';
  }

  const dp = decimals === 'auto' ? (Number.isInteger(n) ? 0 : 2) : decimals;
  const fixed = Math.abs(n).toFixed(dp);
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const sign = n < 0 ? '-' : '';
  const body = decPart ? `${sign}${grouped},${decPart}` : `${sign}${grouped}`;

  return suffix ? `${body}${NBSP}zł` : body;
}
