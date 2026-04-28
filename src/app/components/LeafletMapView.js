'use client';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function SelfMarker({ lat, lng, color }) {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    // Marker henüz yoksa oluştur (sadece bir kez)
    if (!markerRef.current) {
      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      markerRef.current = L.marker([lat || 0, lng || 0], {
        icon,
        interactive: false,
        keyboard: false,
        zIndexOffset: 9999,
        bubblingMouseEvents: false,
      }).addTo(map);
    }

    // Cleanup: sadece component tamamen unmount olunca
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // [] → sadece mount/unmount, ASLA yeniden çalışmaz

  // Konum değişince sadece setLatLng - yeni marker oluşturma
  useEffect(() => {
    if (markerRef.current && lat && lng) {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

  return null;
}

// Leaflet default icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createDivIcon(html, size = 28) {
  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapRefSetter({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    if (mapRef) mapRef.current = map;
  }, [map, mapRef]);
  return null;
}


export default function LeafletMapView({
  lat,
  lng,
  others,
  dark,
  currentUser,
  onSelect,
  onProfileClick,
  onMarkerSheet,
  heading,
  onResetRef,
  getRoleColor,
  getRoleGlow,
}) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (onResetRef) {
      onResetRef.current = () => {
        if (lat && lng && mapRef.current) {
          mapRef.current.setView([lat, lng], 15, { animate: true });
        }
      };
    }
  }, [onResetRef, lat, lng]);

  const currentUserData = currentUser || { roles: ['musteri'], user_role: 'musteri', user_id: 'self' };
  const selfColor = getRoleColor(currentUserData.roles);

  const tileUrl = dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

  const tileAttrib = dark
    ? '&copy; <a href="https://carto.com/">CARTO</a>'
    : '&copy; Google Maps';

  if (!lat && !lng) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#2ECC71', fontSize: 14 }}>Harita yükleniyor...</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <style>{`
        .leaflet-container { width: 100%; height: 100%; z-index: 0; }
        .leaflet-control-zoom { z-index: 400 !important; }
        .leaflet-pane { z-index: 200 !important; }
        .leaflet-top, .leaflet-bottom { z-index: 400 !important; }
      `}</style>
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        minZoom={1}
        maxZoom={22}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        dragging={true}
        tap={false}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
      >
        <TileLayer url={tileUrl} attribution={tileAttrib} maxZoom={22} />
        <MapRefSetter mapRef={mapRef} />

        {/* Kendi marker'ı - koşulsuz render, içeride guard var, duplicate olmaz */}
        <SelfMarker lat={lat} lng={lng} color={selfColor} />

        {/* Diğer kullanıcı marker'ları */}
        {(others || []).map((u) => {
          const uRoles = u.roles || [u.user_role];
          const color = getRoleColor(uRoles);
          const glow = getRoleGlow(uRoles);
          const otherIconHtml = `
            <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
              <div style="
                width:14px;height:14px;border-radius:50%;
                background-color:${color};
                border:2px solid rgba(255,255,255,0.9);
                box-shadow:${glow};
                cursor:pointer;
              "></div>
            </div>
          `;
          return (
            <Marker
              key={`${u.user_id}-${uRoles.join(',')}`}
              position={[u.lat, u.lng]}
              icon={createDivIcon(otherIconHtml, 20)}
              eventHandlers={{
                click: () => {
                  if (onMarkerSheet) return onMarkerSheet(u);
                  if (onProfileClick) return onProfileClick(u);
                  if (onSelect) onSelect(u);
                },
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
