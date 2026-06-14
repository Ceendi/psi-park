import type { ReactNode } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png?url';
import markerIcon from 'leaflet/dist/images/marker-icon.png?url';
import markerShadow from 'leaflet/dist/images/marker-shadow.png?url';
import { cn } from '@/shared/lib/cn';

// Fix Leaflet's default marker icon paths under Vite's bundler (PLAN §10.4).
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapMarker extends LatLng {
  id: string | number;
  popup?: ReactNode;
}

export interface MapViewProps {
  center: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  onMapClick?: (latlng: LatLng) => void;
  height?: number | string;
  className?: string;
  children?: ReactNode;
}

function ClickHandler({ onMapClick }: { onMapClick: (latlng: LatLng) => void }) {
  useMapEvents({
    click: (event) => onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng }),
  });
  return null;
}

/** Leaflet + OpenStreetMap wrapper (PLAN §10.4). */
export function MapView({
  center,
  zoom = 13,
  markers = [],
  onMapClick,
  height = 400,
  className,
  children,
}: MapViewProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      scrollWheelZoom
      style={{ height }}
      className={cn('overflow-hidden rounded-lg', className)}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((marker) => (
        <Marker key={marker.id} position={[marker.lat, marker.lng]}>
          {marker.popup && <Popup>{marker.popup}</Popup>}
        </Marker>
      ))}
      {onMapClick && <ClickHandler onMapClick={onMapClick} />}
      {children}
    </MapContainer>
  );
}

export default MapView;
