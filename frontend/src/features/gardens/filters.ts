/**
 * Catalogue filter state (PLAN F2). Filters live in the URL query string so a
 * search is shareable and survives back/forward. `parseFilters` reads them with
 * defaults, `toSearchParams` writes the non-default ones, and `toApiParams` maps
 * to the backend's `GET /gardens/` query names (PLAN §8.2).
 */
export type SortKey = 'recommended' | 'cheapest' | 'top_rated';
export type ViewMode = 'split' | 'list';

export interface GardenFilters {
  city: string;
  date: string; // yyyy-MM-dd
  timeFrom: string; // HH:mm
  timeTo: string; // HH:mm
  dogs: number; // garden must accept ≥ this many
  minPrice: string;
  maxPrice: string;
  minArea: string;
  surface: string; // '' | grass | sand | paved | mixed
  amenities: string[];
  sort: SortKey;
  bbox: string; // in_bbox: minLng,minLat,maxLng,maxLat
  page: number;
  view: ViewMode;
}

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recommended', label: 'Polecane' },
  { value: 'cheapest', label: 'Najtańsze' },
  { value: 'top_rated', label: 'Najwyżej oceniane' },
];

const SORT_KEYS: SortKey[] = ['recommended', 'cheapest', 'top_rated'];

export const EMPTY_FILTERS: GardenFilters = {
  city: '',
  date: '',
  timeFrom: '',
  timeTo: '',
  dogs: 1,
  minPrice: '',
  maxPrice: '',
  minArea: '',
  surface: '',
  amenities: [],
  sort: 'recommended',
  bbox: '',
  page: 1,
  view: 'split',
};

export function parseFilters(params: URLSearchParams): GardenFilters {
  const dogs = Number(params.get('dogs'));
  const page = Number(params.get('page'));
  const sort = params.get('sort');
  const view = params.get('view');
  const amenities = params.get('amenities');
  return {
    city: params.get('city') ?? '',
    date: params.get('date') ?? '',
    timeFrom: params.get('time_from') ?? '',
    timeTo: params.get('time_to') ?? '',
    dogs: Number.isFinite(dogs) && dogs >= 1 ? dogs : 1,
    minPrice: params.get('min_price') ?? '',
    maxPrice: params.get('max_price') ?? '',
    minArea: params.get('min_area') ?? '',
    surface: params.get('surface') ?? '',
    amenities: amenities ? amenities.split(',').filter(Boolean) : [],
    sort: sort && SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : 'recommended',
    bbox: params.get('bbox') ?? '',
    page: Number.isFinite(page) && page > 1 ? page : 1,
    view: view === 'list' ? 'list' : 'split',
  };
}

/** Serialize to a URLSearchParams, omitting defaults to keep the URL clean. */
export function toSearchParams(f: GardenFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.city) p.set('city', f.city);
  if (f.date) p.set('date', f.date);
  if (f.timeFrom) p.set('time_from', f.timeFrom);
  if (f.timeTo) p.set('time_to', f.timeTo);
  if (f.dogs > 1) p.set('dogs', String(f.dogs));
  if (f.minPrice) p.set('min_price', f.minPrice);
  if (f.maxPrice) p.set('max_price', f.maxPrice);
  if (f.minArea) p.set('min_area', f.minArea);
  if (f.surface) p.set('surface', f.surface);
  if (f.amenities.length) p.set('amenities', f.amenities.join(','));
  if (f.sort !== 'recommended') p.set('sort', f.sort);
  if (f.bbox) p.set('bbox', f.bbox);
  if (f.page > 1) p.set('page', String(f.page));
  if (f.view !== 'split') p.set('view', f.view);
  return p;
}

const ORDERING: Record<SortKey, string | undefined> = {
  recommended: undefined,
  cheapest: 'price_per_hour',
  top_rated: '-rating_avg',
};

/** Map filters to `GET /gardens/` query params (PLAN §8.2). */
export function toApiParams(f: GardenFilters): Record<string, string | number> {
  const params: Record<string, string | number> = { page: f.page, page_size: 12 };
  if (f.city) params.city = f.city;
  if (f.date) params.date = f.date;
  if (f.timeFrom) params.time_from = f.timeFrom;
  if (f.timeTo) params.time_to = f.timeTo;
  if (f.dogs > 1) params.max_dogs = f.dogs;
  if (f.minPrice) params.min_price = f.minPrice;
  if (f.maxPrice) params.max_price = f.maxPrice;
  if (f.minArea) params.min_area = f.minArea;
  if (f.surface) params.surface_type = f.surface;
  if (f.amenities.length) params.amenities = f.amenities.join(',');
  if (f.bbox) params.in_bbox = f.bbox;
  const ordering = ORDERING[f.sort];
  if (ordering) params.ordering = ordering;
  return params;
}

/** Count the active "narrowing" filters (drives the "Wszystkie filtry" badge). */
export function activeFilterCount(f: GardenFilters): number {
  let n = 0;
  if (f.minPrice) n += 1;
  if (f.maxPrice) n += 1;
  if (f.minArea) n += 1;
  if (f.surface) n += 1;
  n += f.amenities.length;
  return n;
}
