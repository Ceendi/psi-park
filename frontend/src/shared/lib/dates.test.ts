import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateShort,
  formatTime,
  formatDateTimeRange,
  hoursBetween,
  buildHourSlots,
  toISODate,
} from './dates';

// Dates are built with local-time constructors so assertions stay stable in any
// test-runner timezone.
const may24at15 = new Date(2026, 4, 24, 15, 0);
const may24at17 = new Date(2026, 4, 24, 17, 0);

describe('dates', () => {
  it('formatDate uses the Polish genitive month', () => {
    expect(formatDate(may24at15)).toBe('24 maja 2026');
  });

  it('formatTime renders 24h HH:mm', () => {
    expect(formatTime(may24at15)).toBe('15:00');
  });

  it('toISODate renders the calendar date', () => {
    expect(toISODate(may24at15)).toBe('2026-05-24');
  });

  it('formatDateShort includes the day and month', () => {
    // Weekday abbreviation is locale-dependent; assert the stable part.
    expect(formatDateShort(may24at15)).toContain('24 maja');
  });

  it('formatDateTimeRange joins the short date and the hour range', () => {
    expect(formatDateTimeRange(may24at15, may24at17)).toContain('24 maja · 15:00–17:00');
  });

  it('hoursBetween returns fractional hours', () => {
    expect(hoursBetween(may24at15, may24at17)).toBe(2);
    expect(hoursBetween(may24at15, new Date(2026, 4, 24, 17, 30))).toBe(2.5);
  });

  it('buildHourSlots lists whole-clock slots within opening hours', () => {
    expect(buildHourSlots('08:00', '11:00')).toEqual(['08:00', '09:00', '10:00']);
    expect(buildHourSlots('20:00', '20:00')).toEqual([]);
  });

  it('parses ISO strings as well as Date objects', () => {
    expect(formatTime('2026-05-24T15:00:00+02:00')).toMatch(/^\d{2}:\d{2}$/);
  });
});
