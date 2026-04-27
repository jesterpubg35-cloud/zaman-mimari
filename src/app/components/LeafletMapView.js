'use client';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

function GPSTracker({ lat, lng, isTracking, mapRef }) {
  const map = useMap();
  useEffect(() => {
    if (mapRef) mapRef.current = map;
  }, [map, mapRef]);

  useEffect(() => {
    if (lat && lng && isTracking && map) {
      map.setView([lat, lng], map.getZoom(), { animate: true });
    }
  }, [lat, lng, isTracking, map]);

  return null;
}

function InteractionHandler({ onUserMove }) {
  useMapEvents({
    dragstart: () => onUserMove(),
    zoomstart: () => onUserMove(),
  });
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
  const [isTracking, setIsTracking] = useState(true);
  const userMoved = useRef(false);

  const handleUserMove = () => {
    if (!userMoved.current) {
      userMoved.current = true;
      setIsTracking(false);
    }
  };

  useEffect(() => {
    if (onResetRef) {
      onResetRef.current = () => {
        userMoved.current = false;
        setIsTracking(true);
        if (lat && lng && mapRef.current) {
          mapRef.current.setView([lat, lng], 15, { animate: true });
        }
      };
    }
  }, [onResetRef, lat, lng]);

  const currentUserData = currentUser || { roles: ['musteri'], user_role: 'musteri', user_id: 'self' };
  const selfColor = getRoleColor(currentUserData.roles);

  const selfIconHtml = `
    <div style="width:28px;height:28px;position:relative;display:flex;align-items:center;justify-content:center;">
      ${heading !== null && heading !== undefined ? `
        <div style="
          position:absolute;
          inset:0;
          display:flex;
          align-items:flex-start;
          justify-content:center;
          transform:rotate(${heading}deg);
          transform-origin:50% 50%;
        ">
          <div style="
            width:0;height:0;
            border-left:5px solid transparent;
            border-right:5px solid transparent;
            border-bottom:11px solid ${selfColor};
            transform:translateY(-7px);
            opacity:0.95;
          "></div>
        </div>
      ` : ''}
      <div style="
        width:14px;height:14px;border-radius:50%;
        background-color:${selfColor};
        border:2px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.5);
        position:relative;z-index:1;
      "></div>
    </div>
  `;

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
        <GPSTracker lat={lat} lng={lng} isTracking={isTracking} mapRef={mapRef} />
        <InteractionHandler onUserMove={handleUserMove} />

        {/* Kendi marker'ı */}
        {lat && lng && (
          <Marker
            position={[lat, lng]}
            icon={L.divIcon({ html: selfIconHtml, className: '', iconSize: [28, 28], iconAnchor: [14, 14] })}
            eventHandlers={{}}
          />
        )}

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
