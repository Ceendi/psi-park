import { describe, it, expect } from 'vitest';
import { describeDog, HEALTH_DOT, healthStatusLabel, healthTone } from './health';

describe('dog health helpers', () => {
  it('maps backend statuses onto the design dot tones', () => {
    expect(healthTone('valid')).toBe('ok');
    expect(healthTone('expiring_soon')).toBe('warn');
    expect(healthTone('expired')).toBe('bad');
    expect(healthTone('unknown')).toBe('neutral');
    expect(healthTone(null)).toBe('neutral');
  });

  it('has a dot class for every tone', () => {
    expect(Object.keys(HEALTH_DOT)).toEqual(['ok', 'warn', 'bad', 'neutral']);
  });

  it('labels each status in Polish', () => {
    expect(healthStatusLabel('valid')).toBe('Aktualne');
    expect(healthStatusLabel('expiring_soon')).toBe('Wygasa wkrótce');
    expect(healthStatusLabel('expired')).toBe('Przeterminowane');
    expect(healthStatusLabel(undefined)).toBe('Brak danych');
  });

  it('describes sex + sterilisation as on the card', () => {
    expect(describeDog({ sex: 'female', is_sterilized: true })).toBe('suka, sterylizowana');
    expect(describeDog({ sex: 'male', is_sterilized: false })).toBe('pies, niewykastrowany');
    expect(describeDog({ sex: '', is_sterilized: false })).toBe('');
  });
});
