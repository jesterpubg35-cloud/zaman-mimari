'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('react-leaflet').then((mod) => {
  if (typeof window !== 'undefined' && !document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }

  const { MapContainer, TileLayer, Marker, useMap } = mod;
  const L = require('leaflet');

  function MapController({ mapRef }) {
    const map = useMap();
    useEffect(() => {
      mapRef.current = map;

      const invalidate = () => {
        try { map.invalidateSize(); } catch {}
      };

      const t = setTimeout(invalidate, 50);
      const t2 = setTimeout(invalidate, 250);

      window.addEventListener('resize', invalidate, { passive: true });
      window.addEventListener('orientationchange', invalidate, { passive: true });

      return () => {
        clearTimeout(t);
        clearTimeout(t2);
        window.removeEventListener('resize', invalidate);
        window.removeEventListener('orientationchange', invalidate);
      };
    }, [map, mapRef]);
    return null;
  }

  const roleOrder = ['kurye', 'emanetci', 'siraci', 'hepsi'];
  const getRoleColor = (roles) => {
    if (!roles || roles.length === 0) return '#9ca3af';
    if (roles.includes('hepsi')) return '#9333ea';
    if (roles.includes('kurye')) return '#fbbf24';
    if (roles.includes('siraci')) return '#22c55e';
    if (roles.includes('emanetci')) return '#3b82f6';
    return '#9ca3af';
  };

  const getPrimaryRole = (u) => {
    const roles = u?.roles || [u?.user_role];
    for (const r of roleOrder) if (roles?.includes(r)) return r;
    return 'musteri';
  };

  const createMyIcon = (roles) => {
    const color = getRoleColor(roles || ['musteri']);
    return L.divIcon({
      className: 'custom-icon',
      html: `<div style="position:relative;"><div style="width:16px;height:16px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 0 12px ${color};"></div><div style="position:absolute;top:-1px;right:-1px;width:6px;height:6px;background:#2ecc71;border-radius:50%;border:1px solid white;"></div></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  };

  return function LeafletMapInner(props) {
    const {
      lat,
      lng,
      others,
      onSelect,
      selectedId,
      dark,
      activeJobUserIds,
      onProfileClick,
      currentUser,
      mapRef,
    } = props;

    const themeUrl = dark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const createRoleIcon = (user, isSelected, isActive) => {
      const roles = user.roles || [user.user_role];
      const color = getRoleColor(roles);
      const primary = getPrimaryRole(user);
      const pulse = isActive ? 'animation: marker-pulse 2s infinite;' : '';

      return L.divIcon({
        className: 'custom-icon',
        html: `
              <div style="position:relative;transform:scale(${isSelected ? '1.3' : '0.9'});transition:transform 0.2s;">
                <div style="width:16px;height:16px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 0 ${isActive ? '14px ' + color : '8px rgba(0,0,0,0.3)'};${pulse}"></div>
                ${user.avatar_url ? `<img src="${user.avatar_url}" style="position:absolute;top:-4px;left:-4px;width:24px;height:24px;border-radius:50%;border:2px solid white;object-fit:cover;" />` : ''}
                <div style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);font-size:10px;font-weight:900;color:white;text-shadow:0 1px 4px rgba(0,0,0,0.6);">
                  ${primary === 'kurye' ? '📦' : primary === 'emanetci' ? '💼' : primary === 'siraci' ? '⏳' : primary === 'hepsi' ? '🌍' : ''}
                </div>
              </div>
              <style>@keyframes marker-pulse{0%{box-shadow:0 0 0 0 ${color}80}70%{box-shadow:0 0 0 10px ${color}00}100%{box-shadow:0 0 0 0 ${color}00}}</style>
            `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
    };

    return (
      <MapContainer
        center={[lat || 38.411, lng || 27.158]}
        zoom={15}
        minZoom={1}
        maxZoom={19}
        style={{ height: '100%', width: '100%', backgroundColor: dark ? '#1a1a1a' : '#e5e5e5' }}
        zoomControl={false}
        worldCopyJump={false}
        className={dark ? 'dark-map' : 'light-map'}
      >
        <MapController mapRef={mapRef} />
        <TileLayer
          url={themeUrl}
          noWrap={true}
          updateWhenIdle={false}
          updateInterval={50}
          keepBuffer={4}
          maxNativeZoom={19}
          minNativeZoom={1}
        />
        {lat && lng && (
          <Marker
            position={[lat, lng]}
            icon={createMyIcon(currentUser?.roles || [currentUser?.user_role || 'musteri'])}
          />
        )}
        {(others || []).map((u) => (
          <Marker
            key={u.user_id}
            position={[u.lat, u.lng]}
            icon={createRoleIcon(u, selectedId === u.user_id, (activeJobUserIds || []).includes(u.user_id))}
            eventHandlers={{ click: () => (onProfileClick ? onProfileClick(u) : onSelect(u)) }}
          />
        ))}
      </MapContainer>
    );
  };
}), { ssr: false });

export default function MapView({
  lat,
  lng,
  others,
  selectedId,
  dark,
  activeJobUserIds,
  currentUser,
  onSelect,
  onProfileClick,
}) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const invalidate = () => {
      try { mapRef.current?.invalidateSize?.(); } catch {}
    };

    const t1 = setTimeout(invalidate, 50);
    const t2 = setTimeout(invalidate, 250);

    let ro;
    try {
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => invalidate());
        ro.observe(el);
      }
    } catch {}

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      try { ro?.disconnect?.(); } catch {}
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <LeafletMap
        lat={lat}
        lng={lng}
        others={others}
        onSelect={onSelect}
        onProfileClick={onProfileClick}
        selectedId={selectedId}
        dark={dark}
        activeJobUserIds={activeJobUserIds}
        currentUser={currentUser}
        mapRef={mapRef}
      />
    </div>
  );
}
