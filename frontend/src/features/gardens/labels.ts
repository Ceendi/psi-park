import type { Amenity, SurfaceType } from '@/shared/api/types';

/** PL labels for garden enums (PLAN §10 — FE owns PL; codes match the contract). */
export const SURFACE_LABELS: Record<SurfaceType, string> = {
  grass: 'Trawa',
  sand: 'Piasek',
  paved: 'Utwardzona',
  mixed: 'Mieszana',
};

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
