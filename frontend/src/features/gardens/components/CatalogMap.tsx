import { useEffect, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { StarFilledIcon } from '@/shared/ui';
import { formatPLN } from '@/shared/lib/money';
import type { GardenListItem } from '@/shared/api/types';

// Kraków centre (seed city, PLAN §14) — the map is uncontrolled, so this is the
// mount-time view only; user panning drives the bbox filter from there.
const DEFAULT_CENTER: [number, number] = [50.0614, 19.9372];

function priceIcon(price: string, active: boolean): L.DivIcon {
  const bg = active ? '#2E7D32' : '#FFFFFF';
  const color = active ? '#FAFFFA' : '#1B1B1B';
  return L.divIcon({
    className: '',
    iconSize: [1, 1],
    iconAnchor: [0, 0],
    html:
      `<div style="transform:translate(-50%,-100%);white-space:nowrap;border-radius:999px;` +
      `padding:4px 10px;font:600 12px Inter,system-ui,sans-serif;background:${bg};color:${color};` +
      `border:1px solid rgba(20,30,20,.15);box-shadow:0 4px 12px rgba(20,30,20,.18);">${formatPLN(price)}</div>`,
  });
}

/** Emit the map bounds (debounced) after the user pans/zooms — feeds `in_bbox`. */
function BoundsWatcher({ onBoundsChange }: { onBoundsChange: (bbox: string) => void }) {
  const timer = useRef<number | null>(null);
  useMapEvents({
    moveend: (e) => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const b = e.target.getBounds();
        onBoundsChange(
          [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n) => n.toFixed(6)).join(','),
        );
      }, 500);
    },
  });
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);
  return null;
}

export interface CatalogMapProps {
  gardens: GardenListItem[];
  highlightedId: number | null;
  onHover: (id: number | null) => void;
  onSelect: (id: number) => void;
  onBoundsChange: (bbox: string) => void;
}

/** Right-rail Leaflet map with price pins, hover-sync and pan→bbox (PLAN F2). */
export function CatalogMap({ gardens, highlightedId, onHover, onSelect, onBoundsChange }: CatalogMapProps) {
  return (
    <MapContainer center={DEFAULT_CENTER} zoom={11} scrollWheelZoom className="size-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <BoundsWatcher onBoundsChange={onBoundsChange} />
      {gardens.map((g) => {
        const lat = Number(g.latitude);
        const lng = Number(g.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return (
          <Marker
            key={g.id}
            position={[lat, lng]}
            icon={priceIcon(g.price_per_hour, highlightedId === g.id)}
            zIndexOffset={highlightedId === g.id ? 1000 : 0}
            eventHandlers={{
              mouseover: () => onHover(g.id),
              mouseout: () => onHover(null),
            }}
          >
            <Popup>
              <div className="min-w-44">
                <div className="text-sm font-semibold text-ink-900">{g.title}</div>
                <div className="mt-0.5 text-[12px] text-ink-500">{g.city}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-[13px] font-semibold">{formatPLN(g.price_per_hour)} / h</span>
                  <span className="flex items-center gap-1 text-[12px]">
                    <StarFilledIcon size={12} className="text-sun" />
                    {g.rating_avg != null ? g.rating_avg.toFixed(2).replace('.', ',') : '—'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(g.id)}
                  className="mt-2 w-full rounded-pill bg-green-700 px-3 py-1.5 text-[12px] font-semibold text-bone transition hover:bg-green-800"
                >
                  Zobacz ogród
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export default CatalogMap;
