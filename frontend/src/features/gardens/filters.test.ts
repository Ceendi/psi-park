import { describe, it, expect } from 'vitest';
import {
  activeFilterCount,
  EMPTY_FILTERS,
  parseFilters,
  toApiParams,
  toSearchParams,
} from './filters';

describe('garden filters', () => {
  it('parses URL params with sensible defaults', () => {
    const f = parseFilters(new URLSearchParams('city=Kraków&sort=cheapest&dogs=3&amenities=pool,shade&page=2&view=list'));
    expect(f.city).toBe('Kraków');
    expect(f.sort).toBe('cheapest');
    expect(f.dogs).toBe(3);
    expect(f.amenities).toEqual(['pool', 'shade']);
    expect(f.page).toBe(2);
    expect(f.view).toBe('list');
  });

  it('falls back to defaults for missing/invalid params', () => {
    const f = parseFilters(new URLSearchParams('sort=bogus&dogs=0&page=-1'));
    expect(f.sort).toBe('recommended');
    expect(f.dogs).toBe(1);
    expect(f.page).toBe(1);
  });

  it('round-trips through toSearchParams → parseFilters', () => {
    const original = {
      ...EMPTY_FILTERS,
      city: 'Warszawa',
      timeFrom: '10:00',
      timeTo: '14:00',
      dogs: 2,
      maxPrice: '60',
      amenities: ['pool', 'water'],
      sort: 'top_rated' as const,
      page: 3,
    };
    const round = parseFilters(toSearchParams(original));
    expect(round).toEqual(original);
  });

  it('omits defaults from the URL', () => {
    expect(toSearchParams(EMPTY_FILTERS).toString()).toBe('');
  });

  it('maps to backend query names', () => {
    const params = toApiParams({
      ...EMPTY_FILTERS,
      city: 'Kraków',
      dogs: 3,
      minPrice: '20',
      maxPrice: '80',
      minArea: '300',
      surface: 'grass',
      amenities: ['pool', 'shade'],
      sort: 'cheapest',
      bbox: '19,50,20,51',
      page: 2,
    });
    expect(params).toMatchObject({
      city: 'Kraków',
      max_dogs: 3,
      min_price: '20',
      max_price: '80',
      min_area: '300',
      surface_type: 'grass',
      amenities: 'pool,shade',
      in_bbox: '19,50,20,51',
      ordering: 'price_per_hour',
      page: 2,
      page_size: 12,
    });
  });

  it('recommended sort sends no ordering; single dog sends no max_dogs', () => {
    const params = toApiParams(EMPTY_FILTERS);
    expect(params.ordering).toBeUndefined();
    expect(params.max_dogs).toBeUndefined();
  });

  it('counts active narrowing filters', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...EMPTY_FILTERS, maxPrice: '80', surface: 'grass', amenities: ['pool'] })).toBe(3);
  });
});
