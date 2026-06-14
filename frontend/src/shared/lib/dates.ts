import { format, parseISO, differenceInMinutes } from 'date-fns';
import { pl } from 'date-fns/locale';

/**
 * Date / time / slot helpers (PLAN §16.3). All display formatting uses the
 * Polish locale. The backend speaks ISO-8601 with offset (PLAN AD-15); these
 * helpers accept either an ISO string or a `Date`.
 */

export type DateInput = Date | string;

function toDate(value: DateInput): Date {
  return typeof value === 'string' ? parseISO(value) : value;
}

/** "24 maja 2026" (pattern overridable). */
export function formatDate(value: DateInput, pattern = 'd MMMM yyyy'): string {
  return format(toDate(value), pattern, { locale: pl });
}

/** "sob, 24 maja" — the compact date used on cards and summaries. */
export function formatDateShort(value: DateInput): string {
  return format(toDate(value), 'EEE, d MMMM', { locale: pl });
}

/** "15:00" */
export function formatTime(value: DateInput): string {
  return format(toDate(value), 'HH:mm', { locale: pl });
}

/** "sob, 24 maja · 15:00–17:00" */
export function formatDateTimeRange(start: DateInput, end: DateInput): string {
  return `${formatDateShort(start)} · ${formatTime(start)}–${formatTime(end)}`;
}

/** ISO calendar date "yyyy-MM-dd" — the shape availability endpoints expect. */
export function toISODate(value: DateInput): string {
  return format(toDate(value), 'yyyy-MM-dd');
}

/** Number of (fractional) hours between two instants. */
export function hoursBetween(start: DateInput, end: DateInput): number {
  return differenceInMinutes(toDate(end), toDate(start)) / 60;
}

/**
 * Whole-clock-hour slot labels within opening hours `[from, to)`.
 * `buildHourSlots("08:00", "11:00") → ["08:00", "09:00", "10:00"]`.
 */
export function buildHourSlots(openFrom: string, openTo: string): string[] {
  const startH = Number.parseInt(openFrom.slice(0, 2), 10);
  const endH = Number.parseInt(openTo.slice(0, 2), 10);
  const slots: string[] = [];
  for (let h = startH; h < endH; h += 1) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
  }
  return slots;
}

export { parseISO };
