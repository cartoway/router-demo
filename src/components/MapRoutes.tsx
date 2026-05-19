import React, { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { RoutePoint, RouteResult } from '../types/route';
import { useTranslation } from '../contexts/TranslationContext';
import { isDevTransportMode } from '../config/transportModes';
import { cleanupRouteLayers, filterValidCoordinates, addRouteSourceAndLayers, buildBoundsForRoutes, addMapOverlay, removeMapOverlay } from '../utils/map';

interface MapRoutesProps {
  onPointSelect: (point: RoutePoint | null, type: 'origin' | 'destination') => void;
  origin: RoutePoint | null;
  destination: RoutePoint | null;
  viapoints: (RoutePoint | null)[];
  onViapointAdd: (index: number, point: RoutePoint) => void;
  onViapointChange: (index: number, point: RoutePoint | null) => void;
  onViapointRemove: (index: number) => void;
  routes: RouteResult[];
  visibleRoutes: string[];
}

// Given route pixel coords, find the viapoint insertion index for a click position.
function findInsertIdx(
  m: maplibregl.Map,
  coords: [number, number][],
  clickLng: number,
  clickLat: number,
  viapoints: (RoutePoint | null)[],
): number {
  const defined = viapoints.filter(v => v !== null).length;
  if (coords.length < 2) return defined;
  const cp = m.project([clickLng, clickLat]);
  let bestDist = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const pa = m.project(coords[i]);
    const pb = m.project(coords[i + 1]);
    const dx = pb.x - pa.x, dy = pb.y - pa.y;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((cp.x - pa.x) * dx + (cp.y - pa.y) * dy) / lenSq));
    const cx = pa.x + t * dx, cy = pa.y + t * dy;
    const dist = Math.hypot(cp.x - cx, cp.y - cy);
    if (dist < bestDist) { bestDist = dist; bestIdx = i; }
  }
  const ratio = (bestIdx + 0.5) / coords.length;
  return Math.round(ratio * (defined + 1));
}

export const MapRoutes: React.FC<MapRoutesProps> = ({
  onPointSelect,
  origin,
  destination,
  viapoints,
  onViapointAdd,
  onViapointChange,
  onViapointRemove,
  routes,
  visibleRoutes,
}) => {
  const { t } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const originMarker = useRef<maplibregl.Marker | null>(null);
  const destinationMarker = useRef<maplibregl.Marker | null>(null);
  const viapointMarkersRef = useRef<maplibregl.Marker[]>([]);
  const hasInitialFit = useRef(false);
  const isMapLoaded = useRef(false);
  const suppressNextClickRef = useRef(false);
  const hitLayerIdsRef = useRef<string[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [overlays, setOverlays] = useState<{ lez: boolean; ltz: boolean; truck_restrictions: boolean; charging_station: boolean }>({ lez: false, ltz: false, truck_restrictions: false, charging_station: false });

  // Live ref — always current, avoids stale closures in stable map handlers
  const live = useRef({ origin, destination, viapoints, routes, onPointSelect, onViapointAdd, onViapointChange, onViapointRemove });
  live.current = { origin, destination, viapoints, routes, onPointSelect, onViapointAdd, onViapointChange, onViapointRemove };

  // ---- Stable map event handlers (registered once on load) ----

  const handleMapClick = useRef((e: maplibregl.MapMouseEvent) => {
    if (suppressNextClickRef.current) { suppressNextClickRef.current = false; return; }
    const { origin, destination, onPointSelect } = live.current;
    const pt = { lat: e.lngLat.lat, lng: e.lngLat.lng };
    if (!origin) onPointSelect(pt, 'origin');
    else if (!destination) onPointSelect(pt, 'destination');
  }).current;

  const handleMapMouseDown = useRef((e: maplibregl.MapMouseEvent) => {
    const m = map.current;
    if (!m || !hitLayerIdsRef.current.length) return;
    // Only act if the mousedown is on a hit layer
    const hit = m.queryRenderedFeatures(e.point, { layers: hitLayerIdsRef.current });
    if (!hit.length) return;

    // Geometric guard: ignore if cursor is near an existing marker
    const clickPx = m.project([e.lngLat.lng, e.lngLat.lat]);
    const { origin, destination, viapoints, routes, onViapointAdd } = live.current;
    const markerPoints: RoutePoint[] = [
      ...(origin ? [origin] : []),
      ...(destination ? [destination] : []),
      ...viapoints.filter((v): v is RoutePoint => v !== null),
    ];
    if (markerPoints.some(pt => {
      const px = m.project([pt.lng, pt.lat]);
      return Math.hypot(clickPx.x - px.x, clickPx.y - px.y) < 18;
    })) return;

    e.preventDefault();
    suppressNextClickRef.current = true;

    // Find which route and insertion index
    const layerId = hit[0].layer.id.replace(/-hit$/, '');
    const routeEntry = routes.find(r => layerId.startsWith(`route-${r.mode}`));
    const coords = (routeEntry?.geometry?.coordinates ?? []) as [number, number][];
    const insertIdx = findInsertIdx(m, coords, e.lngLat.lng, e.lngLat.lat, viapoints);

    // Ghost marker follows mouse until mouseup
    const ghostEl = makeViaEl(viapoints.filter(v => v !== null).length + 1);
    ghostEl.style.cursor = 'grabbing';
    const ghost = new maplibregl.Marker({ element: ghostEl, anchor: 'center' }).setLngLat(e.lngLat).addTo(m);
    m.dragPan.disable();
    m.getCanvas().style.cursor = 'grabbing';
    let last = e.lngLat;

    const onMove = (ev: MouseEvent) => {
      const r = m.getCanvas().getBoundingClientRect();
      try { last = m.unproject([ev.clientX - r.left, ev.clientY - r.top] as [number, number]); ghost.setLngLat(last); } catch {}
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      m.dragPan.enable();
      m.getCanvas().style.cursor = '';
      ghost.remove();
      onViapointAdd(insertIdx, { lat: last.lat, lng: last.lng });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }).current;

  // ---- Map init ----
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://maps.cartoway.com/styles/osm-openmaptiles-gl-style/style.json',
      center: [-0.5792, 44.8378],
      zoom: 11,
    });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false, showZoom: true }), 'top-right');
    m.on('load', () => {
      isMapLoaded.current = true;
      setMapReady(true);
      m.on('click', handleMapClick);
      m.on('mousedown', handleMapMouseDown);
    });
    return () => { m.remove(); map.current = null; isMapLoaded.current = false; };
  }, []);

  // ---- Marker helpers ----
  const makeViaEl = (num: number) => {
    const el = document.createElement('div');
    el.style.cssText = `width:22px;height:22px;background-color:#F97316;border-radius:50%;border:3px solid white;box-shadow:0 4px 6px -1px rgba(0,0,0,.1);cursor:grab;position:absolute;transform:translate(-50%,-50%);pointer-events:auto;display:flex;align-items:center;justify-content:center;`;
    const lbl = document.createElement('span');
    lbl.style.cssText = `color:white;font-size:10px;font-weight:700;line-height:1;pointer-events:none;`;
    lbl.textContent = String(num);
    el.appendChild(lbl);
    return el;
  };

  const makeEndpointEl = (color: string) => {
    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.style.cssText = `width:24px;height:24px;background-color:${color};border-radius:50%;border:3px solid white;box-shadow:0 4px 6px -1px rgba(0,0,0,.1);cursor:pointer;position:absolute;transform:translate(-50%,-50%);pointer-events:auto;`;
    const dot = document.createElement('div');
    dot.style.cssText = `width:8px;height:8px;background-color:white;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);`;
    el.appendChild(dot);
    return el;
  };

  const upsertEndpointMarker = useCallback((
    markerRef: React.MutableRefObject<maplibregl.Marker | null>,
    point: RoutePoint | null,
    color: string,
    type: 'origin' | 'destination'
  ) => {
    if (!map.current || !isMapLoaded.current) return;
    markerRef.current?.remove();
    markerRef.current = null;
    if (!point) return;
    const el = makeEndpointEl(color);
    const marker = new maplibregl.Marker({ element: el, anchor: 'center', draggable: true })
      .setLngLat([point.lng, point.lat]).addTo(map.current);
    markerRef.current = marker;
    el.addEventListener('click', (e) => { e.stopPropagation(); live.current.onPointSelect(null, type); });
    marker.on('dragend', () => {
      const ll = marker.getLngLat();
      live.current.onPointSelect({ lat: ll.lat, lng: ll.lng }, type);
    });
  }, []);

  useEffect(() => {
    upsertEndpointMarker(originMarker, origin, '#10B981', 'origin');
  }, [origin, upsertEndpointMarker, mapReady]);

  useEffect(() => {
    upsertEndpointMarker(destinationMarker, destination, '#EF4444', 'destination');
  }, [destination, upsertEndpointMarker, mapReady]);

  // ---- Via markers ----
  useEffect(() => {
    viapointMarkersRef.current.forEach(m => m.remove());
    viapointMarkersRef.current = [];
    if (!map.current || !isMapLoaded.current) return;
    viapoints
      .map((via, idx) => ({ via, idx }))
      .filter((e): e is { via: RoutePoint; idx: number } => e.via !== null)
      .forEach(({ via, idx }, pos) => {
        const el = makeViaEl(pos + 1);
        const marker = new maplibregl.Marker({ element: el, anchor: 'center', draggable: true })
          .setLngLat([via.lng, via.lat]).addTo(map.current!);
        el.addEventListener('click', (e) => { e.stopPropagation(); live.current.onViapointRemove(idx); });
        marker.on('dragend', () => {
          const ll = marker.getLngLat();
          live.current.onViapointChange(idx, { lat: ll.lat, lng: ll.lng });
        });
        viapointMarkersRef.current.push(marker);
      });
  }, [viapoints, mapReady]);

  // ---- Route layers + cursor ----
  useEffect(() => {
    if (!map.current || !mapReady) return;
    cleanupRouteLayers(map.current);
    const newHitIds: string[] = [];
    routes.forEach((route, index) => {
      if (!route.geometry || !visibleRoutes.includes(route.mode)) return;
      const layerId = `route-${route.mode}-${index}`;
      const hitId = `${layerId}-hit`;
      try {
        const valid = filterValidCoordinates(route.geometry.coordinates || []);
        if (!valid.length) return;
        addRouteSourceAndLayers(map.current!, layerId, route.color, valid, isDevTransportMode(route.mode) || route.dimension === 'distance');
        map.current!.addLayer({ id: hitId, type: 'line', source: layerId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': 'transparent', 'line-width': 20, 'line-opacity': 0 } });
        newHitIds.push(hitId);
        map.current!.on('mouseenter', hitId, () => { map.current!.getCanvas().style.cursor = 'crosshair'; });
        map.current!.on('mouseleave', hitId, () => { map.current!.getCanvas().style.cursor = ''; });
      } catch (err) { console.error('Error adding route layer:', err, route); }
    });
    hitLayerIdsRef.current = newHitIds;
    if (routes.length > 0 && origin && destination && !hasInitialFit.current) {
      try {
        const bounds = buildBoundsForRoutes(routes, visibleRoutes, origin, destination);
        if (bounds) { map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 }); hasInitialFit.current = true; }
      } catch {}
    }
    if (routes.length === 0) hasInitialFit.current = false;
  }, [routes, visibleRoutes, origin, destination, mapReady]);

  const OVERLAY_CONFIGS = [
    { key: 'lez' as const, url: 'https://maps.cartoway.com/styles/low_emission_zone/style.json', prefix: 'overlay-lez-' },
    { key: 'ltz' as const, url: 'https://maps.cartoway.com/styles/limited_traffic_zone/style.json', prefix: 'overlay-ltz-' },
    { key: 'truck_restrictions' as const, url: 'https://maps.cartoway.com/styles/truck-restrictions/style.json', prefix: 'overlay-truck-restrictions-' },
    { key: 'charging_station' as const, url: 'https://maps.cartoway.com/styles/charching_station/style.json', prefix: 'overlay-charging-station-' },
  ];

  useEffect(() => {
    if (!map.current || !mapReady) return;
    OVERLAY_CONFIGS.forEach(({ key, url, prefix }) => {
      if (overlays[key]) {
        addMapOverlay(map.current!, url, prefix).catch(() => {});
      } else {
        removeMapOverlay(map.current!, prefix);
      }
    });
  }, [overlays, mapReady]);

  const getInstructionText = () => {
    if (!origin && !destination) return t('map.instructions.selectOrigin');
    if (origin && !destination) return t('map.instructions.selectDestination');
    if (origin && destination) return t('map.instructions.modifyDestination');
    return '';
  };

  return (
    <div className="relative h-full">
      <div ref={mapContainer} className="h-full w-full rounded-lg overflow-hidden shadow-lg" />
      <div className="hidden lg:block absolute top-4 left-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs">
        <p className="text-sm font-medium text-gray-800">{getInstructionText()}</p>
        {(origin || destination) && (
          <p className="text-xs text-gray-600 mt-1">{t('map.instructions.removeMarker')}</p>
        )}
      </div>
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg p-3 shadow-lg space-y-2 min-w-[130px]">
        {(origin || destination) && (
          <>
            <div className="text-xs font-semibold text-gray-700">{t('map.legend.title')}</div>
            <div className="space-y-1">
              {origin && (<div className="flex items-center space-x-2"><div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div><span className="text-xs text-gray-600">{t('map.legend.origin')}</span></div>)}
              {viapoints.filter(Boolean).map((_, idx) => (
                <div key={idx} className="flex items-center space-x-2"><div className="w-4 h-4 bg-orange-400 rounded-full border-2 border-white shadow-sm flex items-center justify-center"><span className="text-white text-[9px] font-bold">{idx + 1}</span></div><span className="text-xs text-gray-600">{t('map.legend.waypoint')} {idx + 1}</span></div>
              ))}
              {destination && (<div className="flex items-center space-x-2"><div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm"></div><span className="text-xs text-gray-600">{t('map.legend.destination')}</span></div>)}
            </div>
            <hr className="border-gray-200" />
          </>
        )}
        <div className="text-xs font-semibold text-gray-700">{t('map.overlays.title')}</div>
        <div className="space-y-1">
          {OVERLAY_CONFIGS.map(({ key }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={overlays[key]}
                onChange={() => setOverlays(prev => ({ ...prev, [key]: !prev[key] }))}
                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-700">{t(`map.overlays.${key}`)}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};


