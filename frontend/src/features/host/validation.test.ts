import { describe, it, expect } from 'vitest';
import { EMPTY_GARDEN, gardenSchema } from './validation';

function valid() {
  return {
    ...EMPTY_GARDEN,
    title: 'Ogród z basenem',
    description: 'Duży, ogrodzony teren.',
    city: 'Kraków',
    address: 'Wola Justowska',
    latitude: '50.061400',
    longitude: '19.937200',
    area_m2: '480',
    price_per_hour: '45',
  };
}

describe('gardenSchema', () => {
  it('accepts a complete garden', () => {
    expect(gardenSchema.safeParse(valid()).success).toBe(true);
  });

  it('requires a location (lat/lng from the map)', () => {
    const result = gardenSchema.safeParse({ ...valid(), latitude: '', longitude: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a closing time before opening', () => {
    const result = gardenSchema.safeParse({ ...valid(), open_from: '20:00', open_to: '08:00' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-numeric area', () => {
    expect(gardenSchema.safeParse({ ...valid(), area_m2: 'abc' }).success).toBe(false);
  });
});
