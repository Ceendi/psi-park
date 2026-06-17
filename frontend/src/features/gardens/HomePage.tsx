import { lazy, Suspense, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { LayoutGrid, Map as MapIcon } from 'lucide-react';
import { Button, EmptyState, GardenIcon, Pagination, Select, Skeleton } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { formatPLN } from '@/shared/lib/money';
import type { GardenListItem } from '@/shared/api/types';
import { useGardens } from './api';
import {
  EMPTY_FILTERS,
  parseFilters,
  SORT_OPTIONS,
  toSearchParams,
  type GardenFilters,
} from './filters';
import { useFavorites } from './favorites';
import { GardenCard } from './components/GardenCard';
import { FiltersBar } from './components/FiltersBar';
import { AllFiltersModal } from './components/AllFiltersModal';

const PAGE_SIZE = 12;
// Leaflet is heavy and home is the landing route — load the map after first paint.
const CatalogMap = lazy(() => import('./components/CatalogMap'));

function HeroStats({ gardens, count }: { gardens: GardenListItem[]; count: number }) {
  const prices = gardens.map((g) => Number(g.price_per_hour)).filter(Number.isFinite);
  const ratings = gardens.map((g) => g.rating_avg).filter((r): r is number => r != null);
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const items = [
    { num: String(count), lbl: 'aktywnych ogrodów' },
    { num: avgPrice ? formatPLN(avgPrice, { decimals: 0 }) : '—', lbl: 'średnia cena za godzinę' },
    { num: avgRating ? `${avgRating.toFixed(1).replace('.', ',')} ★` : '—', lbl: 'średnia ocena' },
  ];
  return (
    <div className="mt-7 flex flex-wrap gap-x-10 gap-y-4">
      {items.map((it) => (
        <div key={it.lbl}>
          <div className="text-2xl font-bold tracking-tight">{it.num}</div>
          <div className="text-[13px] text-ink-500">{it.lbl}</div>
        </div>
      ))}
    </div>
  );
}

/** Public catalogue — hero, filters, split list↔map view (Home Page.html, PLAN F2). */
export function HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const gardens = useGardens(filters);
  const favorites = useFavorites();
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [allFiltersOpen, setAllFiltersOpen] = useState(false);

  // Patch filters → URL. Any change but an explicit page jump resets to page 1.
  function patch(p: Partial<GardenFilters>) {
    const next: GardenFilters = { ...filters, ...p, page: 'page' in p ? (p.page ?? 1) : 1 };
    setSearchParams(toSearchParams(next), { replace: true });
  }

  const results = useMemo(() => gardens.data?.results ?? [], [gardens.data]);
  const count = gardens.data?.count ?? 0;
  const pageCount = Math.ceil(count / PAGE_SIZE);
  const cities = useMemo(
    () => [...new Set(results.map((g) => g.city))].sort((a, b) => a.localeCompare(b, 'pl')),
    [results],
  );

  let body;
  if (gardens.isLoading) {
    body = (
      <div className={cn('grid gap-5', filters.view === 'split' ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3')}>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-72 rounded-lg" />
        ))}
      </div>
    );
  } else if (gardens.isError) {
    body = (
      <EmptyState
        title="Nie udało się wczytać ogrodów"
        description="Spróbuj ponownie za chwilę."
        action={<Button onClick={() => gardens.refetch()}>Odśwież</Button>}
      />
    );
  } else if (results.length === 0) {
    body = (
      <EmptyState
        icon={<GardenIcon size={24} />}
        title="Brak ogrodów dla tych filtrów"
        description="Spróbuj poluzować filtry lub zmienić lokalizację."
        action={
          <Button onClick={() => setSearchParams(toSearchParams(EMPTY_FILTERS), { replace: true })}>
            Wyczyść filtry
          </Button>
        }
      />
    );
  } else {
    body = (
      <div className={cn('grid gap-5', filters.view === 'split' ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3')}>
        {results.map((garden) => (
          <GardenCard
            key={garden.id}
            garden={garden}
            saved={favorites.has(garden.id)}
            onToggleSave={favorites.toggle}
            highlighted={highlightedId === garden.id}
            onHover={setHighlightedId}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <section className="mx-auto max-w-[1400px] px-4 pb-8 pt-12 md:px-8 md:pb-10 md:pt-16">
        <span className="inline-flex items-center gap-2 rounded-pill bg-green-50 px-3 py-1.5 text-[13px] font-medium text-green-800">
          <span className="size-1.5 rounded-full bg-green-600" />
          Zweryfikowane, ogrodzone ogrody w całej Polsce
        </span>
        <h1 className="mt-5 text-[40px] font-bold leading-[1.05] tracking-tight md:text-[56px]">
          Znajdź <em className="relative whitespace-nowrap not-italic text-green-700 after:absolute after:inset-x-0 after:-bottom-[2px] after:-z-10 after:h-[10px] after:rounded-[6px] after:bg-green-100 after:content-['']">idealny ogród</em>
          <br />
          dla swojego psa
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-500">
          Wynajmij prywatny, ogrodzony ogród na godziny — bez tłumów, bez stresu, bez smyczy.
          Spokojne miejsce na spacer, trening albo zabawę z piłką, tylko dla Was.
        </p>
        <HeroStats gardens={results} count={count} />
      </section>

      <FiltersBar
        value={filters}
        onChange={patch}
        availableCities={cities}
        onOpenAllFilters={() => setAllFiltersOpen(true)}
      />

      <section className="mx-auto max-w-[1400px] px-4 py-8 md:px-8">
        <div
          className={cn(
            'grid grid-cols-1 gap-8',
            filters.view === 'split' && 'lg:grid-cols-[1.05fr_0.95fr]',
          )}
        >
          <div>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  {filters.city ? `Ogrody w: ${filters.city}` : 'Ogrody w Polsce'}
                </h2>
                <p className="mt-0.5 text-[13px] text-ink-500">
                  {count} {count === 1 ? 'ogród' : 'ogrodów'}
                  {filters.date ? ` · ${filters.date}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-48">
                  <Select
                    value={filters.sort}
                    aria-label="Sortowanie"
                    onChange={(e) => patch({ sort: e.target.value as GardenFilters['sort'] })}
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="hidden overflow-hidden rounded-pill border border-ink-200 lg:flex">
                  <button
                    type="button"
                    aria-label="Widok z mapą"
                    aria-pressed={filters.view === 'split'}
                    onClick={() => patch({ view: 'split', page: filters.page })}
                    className={cn('grid size-9 place-items-center', filters.view === 'split' ? 'bg-green-700 text-bone' : 'text-ink-700')}
                  >
                    <MapIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Widok listy"
                    aria-pressed={filters.view === 'list'}
                    onClick={() => patch({ view: 'list', page: filters.page })}
                    className={cn('grid size-9 place-items-center', filters.view === 'list' ? 'bg-green-700 text-bone' : 'text-ink-700')}
                  >
                    <LayoutGrid className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {body}

            <Pagination
              className="mt-8 justify-center"
              page={filters.page}
              pageCount={pageCount}
              onChange={(page) => patch({ page })}
            />
          </div>

          {filters.view === 'split' && (
            <aside className="hidden lg:block">
              <div className="sticky top-[140px] h-[calc(100vh-160px)] overflow-hidden rounded-lg border border-ink-100">
                <Suspense fallback={<Skeleton className="size-full rounded-lg" />}>
                  <CatalogMap
                    gardens={results}
                    highlightedId={highlightedId}
                    onHover={setHighlightedId}
                    onSelect={(id) => navigate(`/ogrody/${id}`)}
                    onBoundsChange={(bbox) => patch({ bbox })}
                  />
                </Suspense>
              </div>
            </aside>
          )}
        </div>
      </section>

      <AllFiltersModal
        open={allFiltersOpen}
        onClose={() => setAllFiltersOpen(false)}
        value={filters}
        onApply={patch}
      />
    </div>
  );
}
