import type { Amenity, SurfaceType } from '@/shared/api/types';

/**
 * Polish UI labels for garden enums (PLAN §10 — the FE owns PL mapping; enum
 * values stay English). Codes mirror `AmenitiesEnum` / `SurfaceTypeEnum` from the
 * contract. The garden-detail API also returns `amenities_display`, but the create
 * form has no garden yet, so the catalogue lives here too.
 */
export const AMENITY_LABELS: Record<Amenity, string> = {
  pool: 'Basen dla psów',
  water: 'Woda i miski',
  shelter: 'Wiata / schronienie',
  lighting: 'Oświetlenie wieczorne',
  parking: 'Parking',
  agility: 'Tor agility',
  bench: 'Ławki dla opiekuna',
  bin: 'Kosze na odchody',
  fenced_secure: 'Pełne ogrodzenie 1,8 m',
  shade: 'Naturalny cień / drzewa',
};

export const AMENITY_ORDER: Amenity[] = [
  'pool',
  'water',
  'shelter',
  'lighting',
  'parking',
  'agility',
  'bench',
  'bin',
  'fenced_secure',
  'shade',
];

export const SURFACE_LABELS: Record<SurfaceType, string> = {
  grass: 'Trawa',
  sand: 'Piasek',
  paved: 'Utwardzona',
  mixed: 'Mieszana',
};
