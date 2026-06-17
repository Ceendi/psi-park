import { useEffect, useState } from 'react';
import { Calendar, Minus, Plus, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { PawIcon } from '@/shared/ui';
import type { GardenFilters } from '../filters';
import { activeFilterCount } from '../filters';

const HOURS = Array.from({ length: 17 }, (_, i) => `${String(6 + i).padStart(2, '0')}:00`); // 06:00–22:00
const FENCED = 'fenced_secure';

const chip = 'inline-flex items-center gap-2 rounded-pill border border-ink-200 bg-surface px-3.5 py-2 text-[13px] transition hover:border-ink-900';

export interface FiltersBarProps {
  value: GardenFilters;
  onChange: (patch: Partial<GardenFilters>) => void;
  availableCities: string[];
  onOpenAllFilters: () => void;
}

/** Sticky filter row under the hero (Home Page.html `.filters`). State → URL. */
export function FiltersBar({ value, onChange, availableCities, onOpenAllFilters }: FiltersBarProps) {
  const [city, setCity] = useState(value.city);
  useEffect(() => setCity(value.city), [value.city]);

  const fenced = value.amenities.includes(FENCED);
  const extra = activeFilterCount(value);

  function commitCity() {
    if (city.trim() !== value.city) onChange({ city: city.trim() });
  }

  return (
    <div id="szukaj" className="sticky top-[73px] lg:top-[87px] z-30 border-b border-ink-100 bg-bone/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2.5 px-4 py-3 md:px-8">
        <label className={chip}>
          <input
            list="garden-cities"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onBlur={commitCity}
            onKeyDown={(e) => e.key === 'Enter' && commitCity()}
            placeholder="Całe miasto"
            aria-label="Miasto"
            className="w-28 bg-transparent outline-none placeholder:text-ink-300"
          />
          <datalist id="garden-cities">
            {availableCities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>

        <label className={chip}>
          <Calendar className="size-3.5 text-ink-500" />
          <input
            type="date"
            value={value.date}
            onChange={(e) => onChange({ date: e.target.value })}
            aria-label="Data"
            className="bg-transparent outline-none"
          />
        </label>

        <div className={chip}>
          <select
            value={value.timeFrom}
            onChange={(e) => onChange({ timeFrom: e.target.value })}
            aria-label="Od godziny"
            className="bg-transparent outline-none"
          >
            <option value="">Od</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <span className="text-ink-300">–</span>
          <select
            value={value.timeTo}
            onChange={(e) => onChange({ timeTo: e.target.value })}
            aria-label="Do godziny"
            className="bg-transparent outline-none"
          >
            <option value="">Do</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        <div className={chip}>
          <PawIcon size={14} className="text-ink-500" />
          <button
            type="button"
            aria-label="Mniej psów"
            disabled={value.dogs <= 1}
            onClick={() => onChange({ dogs: Math.max(1, value.dogs - 1) })}
            className="grid size-5 place-items-center rounded-full text-ink-700 disabled:opacity-40"
          >
            <Minus className="size-3" />
          </button>
          <span className="min-w-14 text-center font-medium">
            {value.dogs} {value.dogs === 1 ? 'pies' : 'psy'}
          </span>
          <button
            type="button"
            aria-label="Więcej psów"
            onClick={() => onChange({ dogs: value.dogs + 1 })}
            className="grid size-5 place-items-center rounded-full text-ink-700"
          >
            <Plus className="size-3" />
          </button>
        </div>

        <button
          type="button"
          aria-pressed={fenced}
          onClick={() =>
            onChange({
              amenities: fenced
                ? value.amenities.filter((a) => a !== FENCED)
                : [...value.amenities, FENCED],
            })
          }
          className={cn(chip, fenced && 'border-green-700 bg-green-50 text-green-800')}
        >
          Pełne ogrodzenie
        </button>

        <div className="ml-auto" />

        <button type="button" onClick={onOpenAllFilters} className={cn(chip, 'font-semibold')}>
          <SlidersHorizontal className="size-3.5" />
          Wszystkie filtry
          {extra > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-green-700 font-mono text-[11px] text-bone">
              {extra}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
