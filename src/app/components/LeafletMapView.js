'use client';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
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

// Marker'ı doğrudak map instance üzerinde yönet
let _selfMarker = null;

function MapRefSetter({ mapRef, lat, lng, color }) {
  const map = useMap();

  useEffect(() => {
    if (mapRef) mapRef.current = map;

    if (_selfMarker) {
      _selfMarker.remove();
      _selfMarker = null;
    }

    if (lat && lng) {
      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      _selfMarker = L.marker([lat, lng], {
        icon,
        interactive: false,
        keyboard: false,
        zIndexOffset: 9999,
        bubblingMouseEvents: false,
      }).addTo(map);
    }

    return () => {
      if (_selfMarker) { _selfMarker.remove(); _selfMarker = null; }
    };
  }, [map, mapRef, lat, lng, color]);

  useEffect(() => {
    if (_selfMarker && lat && lng) {
      _selfMarker.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

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
          // flyTo ile daha smooth zoom/pan animasyonu
          mapRef.current.flyTo([lat, lng], 15, {
            animate: true,
            duration: 0.8, // 800ms animasyon süresi
            easeLinearity: 0.35
          });
        }
      };
    }
  }, [onResetRef, lat, lng]);

  const currentUserData = currentUser || { roles: ['musteri'], user_role: 'musteri', user_id: 'self' };
  const selfColor = getRoleColor(currentUserData.roles);

  const tileUrl = dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
  
  // Harita arka plan rengi
  const bgColor = dark ? '#1a1a1a' : '#f5f5f5';

  const tileAttrib = dark
    ? '&copy; <a href="https://carto.com/">CARTO</a>'
    : '&copy; Google Maps';


  if (!lat && !lng) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: dark ? '#1a1a1a' : '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: dark ? '#2ECC71' : '#333', fontSize: 14 }}>Harita yükleniyor...</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'pan-x pan-y', overflow: 'hidden', background: bgColor }}>
      <style>{`
        /* Leaflet container arka plan - asla yeşil olmasın */
        .leaflet-container {
          background: ${bgColor} !important;
        }
        
        /* Tüm tile'lar ve container - ZORLA koyu arka plan */
        .leaflet-tile-pane,
        .leaflet-tile-container,
        .leaflet-tile {
          background-color: ${bgColor} !important;
          background-image: none !important;
          box-shadow: none !important;
        }
        
        /* Yüklenen tile'lar */
        img.leaflet-tile {
          background-color: transparent !important;
        }
        
        /* Tile pane z-index */
        .leaflet-tile-pane {
          z-index: 1 !important;
        }
        
        /* Leaflet kontrol paneli */
        .leaflet-control-container {
          z-index: 1000 !important;
        }
        
        /* Yeşil renk görünmesin diye tüm img'lere zorla */
        .leaflet-tile[src=""] {
          background-color: ${bgColor} !important;
        }
        
        /* SMOOTH ZOOM & PAN OPTİMİZASYONLARI */
        /* GPU acceleration for smooth animations */
        .leaflet-map-pane,
        .leaflet-tile-pane,
        .leaflet-marker-pane,
        .leaflet-popup-pane,
        .leaflet-overlay-pane {
          transform-style: preserve-3d !important;
          backface-visibility: hidden !important;
          will-change: transform !important;
        }
        
        /* Smooth zoom transition */
        .leaflet-zoom-anim .leaflet-tile {
          transition: transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
          will-change: transform !important;
        }
        
        /* Smooth pan transition */
        .leaflet-dragging .leaflet-tile {
          transition: none !important;
        }
        
        /* Marker smooth animation */
        .leaflet-marker-icon {
          transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
          will-change: transform !important;
          transform-style: preserve-3d !important;
          backface-visibility: hidden !important;
        }
        
        /* Popup smooth animation */
        .leaflet-popup {
          transition: opacity 0.2s ease-out, transform 0.2s ease-out !important;
        }
        
        /* Zoom control smooth */
        .leaflet-control-zoom a {
          transition: background-color 0.2s ease !important;
        }
      `}</style>
      
      
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        minZoom={1}
        maxZoom={22}
        style={{ width: '100%', height: '100%', touchAction: 'pan-x pan-y', position: 'relative', zIndex: 1 }}
        zoomControl={true}
        dragging={true}
        tap={false}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        fadeAnimation={true}
        markerZoomAnimation={true}
        zoomAnimation={true}
        zoomSnap={0.25}
        zoomDelta={0.25}
        wheelPxPerZoomLevel={100}
        wheelDebounceTime={60}
        inertia={true}
        inertiaDeceleration={3000}
        inertiaMaxSpeed={2500}
        easeLinearity={0.35}
        worldCopyJump={false}
        maxBoundsViscosity={1.0}
      >
        {/* Ana tile layer - smooth zoom için updateWhenZooming=true */}
        <TileLayer 
          url={tileUrl} 
          attribution={tileAttrib}
          updateWhenZooming={true}
          updateWhenIdle={true}
          keepBuffer={100}
          minZoom={1}
          maxZoom={22}
          errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          eventHandlers={{
            tileerror: (e) => {
              console.warn('Tile load error:', e);
              e.tile.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
            }
          }}
        />
        
        <MapRefSetter mapRef={mapRef} lat={lat} lng={lng} color={selfColor} />

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
