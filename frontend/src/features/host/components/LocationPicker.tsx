import { MapView } from '@/shared/ui/MapView';

export interface LocationPickerProps {
  lat: string;
  lng: string;
  onChange: (lat: string, lng: string) => void;
}

// Kraków centre — the seed/demo city (PLAN §14); used until the host clicks.
const DEFAULT_CENTER = { lat: 50.0614, lng: 19.9372 };

/**
 * Pick a garden's location by clicking the map (PLAN AD-6 — no geocoding; the
 * address/city are typed separately). Stores decimal strings to match `GardenWrite`.
 */
export function LocationPicker({ lat, lng, onChange }: LocationPickerProps) {
  const hasPoint = lat !== '' && lng !== '';
  const point = hasPoint ? { lat: Number(lat), lng: Number(lng) } : null;

  return (
    <div className="flex flex-col gap-2">
      <MapView
        center={point ?? DEFAULT_CENTER}
        zoom={point ? 14 : 12}
        height={320}
        markers={point ? [{ id: 'selected', lat: point.lat, lng: point.lng }] : []}
        onMapClick={(latlng) => onChange(latlng.lat.toFixed(6), latlng.lng.toFixed(6))}
      />
      <p className="text-xs text-ink-500">
        {hasPoint ? (
          <>
            Wybrana lokalizacja: <span className="font-mono text-ink-700">{lat}, {lng}</span>. Kliknij,
            aby zmienić.
          </>
        ) : (
          'Kliknij na mapie, aby wskazać dokładną lokalizację ogrodu.'
        )}
      </p>
    </div>
  );
}
