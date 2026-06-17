import { useEffect, useState } from 'react';
import { Button, Checkbox, FormField, Input, Modal, Select } from '@/shared/ui';
import type { Amenity } from '@/shared/api/types';
import type { GardenFilters } from '../filters';
import { AMENITY_LABELS, AMENITY_ORDER } from '../labels';

export interface AllFiltersModalProps {
  open: boolean;
  onClose: () => void;
  value: GardenFilters;
  onApply: (patch: Partial<GardenFilters>) => void;
}

/** "Wszystkie filtry" — price / area / surface / amenities (PLAN F2). */
export function AllFiltersModal({ open, onClose, value, onApply }: AllFiltersModalProps) {
  const [minPrice, setMinPrice] = useState(value.minPrice);
  const [maxPrice, setMaxPrice] = useState(value.maxPrice);
  const [minArea, setMinArea] = useState(value.minArea);
  const [surface, setSurface] = useState(value.surface);
  const [amenities, setAmenities] = useState<string[]>(value.amenities);

  useEffect(() => {
    if (open) {
      setMinPrice(value.minPrice);
      setMaxPrice(value.maxPrice);
      setMinArea(value.minArea);
      setSurface(value.surface);
      setAmenities(value.amenities);
    }
  }, [open, value]);

  function toggle(code: Amenity) {
    setAmenities((cur) => (cur.includes(code) ? cur.filter((a) => a !== code) : [...cur, code]));
  }

  function apply() {
    onApply({ minPrice, maxPrice, minArea, surface, amenities });
    onClose();
  }

  function reset() {
    setMinPrice('');
    setMaxPrice('');
    setMinArea('');
    setSurface('');
    setAmenities([]);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Wszystkie filtry"
      footer={
        <>
          <Button variant="ghost" onClick={reset}>
            Wyczyść
          </Button>
          <Button onClick={apply}>Pokaż wyniki</Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <FormField label="Cena za godzinę (zł)">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="od"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              aria-label="Cena od"
            />
            <span className="text-ink-300">–</span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="do"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              aria-label="Cena do"
            />
          </div>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Minimalna powierzchnia (m²)" htmlFor="f-area">
            <Input
              id="f-area"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="np. 300"
              value={minArea}
              onChange={(e) => setMinArea(e.target.value)}
            />
          </FormField>
          <FormField label="Nawierzchnia" htmlFor="f-surface">
            <Select id="f-surface" value={surface} onChange={(e) => setSurface(e.target.value)}>
              <option value="">Dowolna</option>
              <option value="grass">Trawa</option>
              <option value="sand">Piasek</option>
              <option value="paved">Utwardzona</option>
              <option value="mixed">Mieszana</option>
            </Select>
          </FormField>
        </div>

        <FormField label="Udogodnienia">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {AMENITY_ORDER.map((code) => (
              <Checkbox
                key={code}
                label={AMENITY_LABELS[code]}
                checked={amenities.includes(code)}
                onChange={() => toggle(code)}
              />
            ))}
          </div>
        </FormField>
      </div>
    </Modal>
  );
}
