import React, { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { RoutePoint } from '../types/route';
import { useTranslation } from '../contexts/TranslationContext';
import { addMapOverlay, removeMapOverlay } from '../utils/map';
import { BASE_MAP_OPTIONS } from '../config/baseMaps';
import { BaseMapSelector } from './BaseMapSelector';

interface MapIsolinesProps {
  onPointSelect: (point: RoutePoint | null, type: 'origin') => void;
  origin: RoutePoint | null;
  isolines: Array<{
    mode: string;
    dimension?: 'time' | 'distance';
    geometry: { type: string; coordinates: any };
    color: string;
  }>;
}

export const MapIsolines: React.FC<MapIsolinesProps> = ({
  onPointSelect,
  origin,
  isolines,
}) => {
  const { t } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const originMarker = useRef<maplibregl.Marker | null>(null);
  const isMapLoaded = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [overlays, setOverlays] = useState<{ lez: boolean; ltz: boolean; truck_restrictions: boolean; charging_station: boolean }>({ lez: false, ltz: false, truck_restrictions: false, charging_station: false });
  const [baseMapUrl, setBaseMapUrl] = useState<string>(BASE_MAP_OPTIONS[0].url);
  const [styleVersion, setStyleVersion] = useState(0);

  const clickHandlerRef = useRef<((e: maplibregl.MapMouseEvent) => void) | null>(null);
  clickHandlerRef.current = (e: maplibregl.MapMouseEvent) => {
    const point: RoutePoint = { lat: e.lngLat.lat, lng: e.lngLat.lng };
    onPointSelect(point, 'origin');
  };

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: BASE_MAP_OPTIONS[0].url,
      center: [-0.5792, 44.8378],
      zoom: 11,
    });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false, showZoom: true }), 'top-right');
    m.on('load', () => {
      isMapLoaded.current = true;
      setMapReady(true);
      setStyleVersion(v => v + 1);
    });
    m.on('click', (e) => clickHandlerRef.current?.(e));
    return () => { if (map.current) { map.current.remove(); map.current = null; isMapLoaded.current = false; } };
  }, []);

  const createMarkerElement = useCallback((color: string) => {
    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.style.cssText = `width:24px;height:24px;background-color:${color};border-radius:50%;border:3px solid white;box-shadow:0 4px 6px -1px rgba(0,0,0,.1);cursor:pointer;position:absolute;transform:translate(-50%,-50%);pointer-events:auto;`;
    const innerDot = document.createElement('div');
    innerDot.style.cssText = `width:8px;height:8px;background-color:white;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);`;
    el.appendChild(innerDot);
    return el;
  }, []);

  useEffect(() => {
    if (!map.current || !isMapLoaded.current) return;
    if (originMarker.current) { originMarker.current.remove(); originMarker.current = null; }
    if (!origin) return;
    const el = createMarkerElement('#10B981');
    const marker = new maplibregl.Marker({ element: el, anchor: 'center', draggable: true })
      .setLngLat([origin.lng, origin.lat]).addTo(map.current);
    originMarker.current = marker;
    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      onPointSelect({ lat: lngLat.lat, lng: lngLat.lng }, 'origin');
    });
  }, [origin, createMarkerElement, onPointSelect, mapReady]);

  useEffect(() => {
    if (!map.current || !mapReady) return;
    try {
      const style = map.current.getStyle();
      if (style && style.layers) {
        style.layers.forEach((layer) => {
          if (layer.id.startsWith('isoline-')) {
            if (map.current!.getLayer(layer.id)) map.current!.removeLayer(layer.id);
          }
        });
      }
      // Also remove lingering sources with ids starting with 'isoline-'
      const sources = (style && (style as any).sources) || {};
      Object.keys(sources).forEach((sourceId) => {
        if (sourceId.startsWith('isoline-') && map.current!.getSource(sourceId)) {
          try { map.current!.removeSource(sourceId); } catch {}
        }
      });
    } catch {}
    isolines.forEach((iso, index) => {
      const layerId = `isoline-${iso.mode}-${index}`;
      try {
        map.current!.addSource(layerId, {
          type: 'geojson',
          data: { type: 'Feature', properties: { mode: iso.mode }, geometry: { type: iso.geometry.type, coordinates: iso.geometry.coordinates } },
        });
        map.current!.addLayer({ id: `${layerId}-fill`, type: 'fill', source: layerId, paint: { 'fill-color': iso.color, 'fill-opacity': 0.12 } });
        map.current!.addLayer({ id: `${layerId}-outline`, type: 'line', source: layerId, paint: { 'line-color': iso.color, 'line-width': 2, 'line-opacity': 0.9 } });
      } catch {}
    });
  }, [isolines, mapReady, styleVersion]);

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
  }, [overlays, mapReady, styleVersion]);

  const handleBaseMapChange = (url: string) => {
    if (url === baseMapUrl) return;
    setBaseMapUrl(url);
    if (map.current && isMapLoaded.current) {
      map.current.setStyle(url);
    }
  };

  return (
    <div className="relative h-full">
      <div ref={mapContainer} className="h-full w-full rounded-lg overflow-hidden shadow-lg" />
      <div className="hidden lg:block absolute top-4 left-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs">
        <p className="text-sm font-medium text-gray-800">{t('map.instructions.selectOrigin')}</p>
      </div>
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg p-3 shadow-lg space-y-2 min-w-[130px]">
        {origin && (
          <>
            <div className="text-xs font-semibold text-gray-700">{t('map.legend.title')}</div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
              <span className="text-xs text-gray-600">{t('map.legend.origin')}</span>
            </div>
            <hr className="border-gray-200" />
          </>
        )}
        <BaseMapSelector value={baseMapUrl} onChange={handleBaseMapChange} />
        <hr className="border-gray-200" />
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


