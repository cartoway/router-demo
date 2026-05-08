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
  routes: RouteResult[];
  visibleRoutes: string[];
}

export const MapRoutes: React.FC<MapRoutesProps> = ({
  onPointSelect,
  origin,
  destination,
  routes,
  visibleRoutes,
}) => {
  const { t } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const originMarker = useRef<maplibregl.Marker | null>(null);
  const destinationMarker = useRef<maplibregl.Marker | null>(null);
  const hasInitialFit = useRef(false);
  const isMapLoaded = useRef(false);
  const currentClickHandler = useRef<((e: maplibregl.MapMouseEvent) => void) | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [overlays, setOverlays] = useState<{ lez: boolean; ltz: boolean }>({ lez: false, ltz: false });

  const handleOriginMarkerClick = useCallback((e: Event) => {
    e.stopPropagation();
    onPointSelect(null, 'origin');
  }, [onPointSelect]);

  const handleDestinationMarkerClick = useCallback((e: Event) => {
    e.stopPropagation();
    onPointSelect(null, 'destination');
  }, [onPointSelect]);

  const createClickHandler = useCallback(() => {
    return (e: maplibregl.MapMouseEvent) => {
      const point: RoutePoint = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      if (!origin) {
        onPointSelect(point, 'origin');
      } else if (!destination) {
        onPointSelect(point, 'destination');
      } else {
        onPointSelect(point, 'destination');
      }
    };
  }, [onPointSelect, origin, destination]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://maps.cartoway.com/styles/osm-openmaptiles-gl-style/style.json',
      center: [-0.5792, 44.8378],
      zoom: 11,
    });
    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false, showZoom: true }), 'top-right');
    map.current.on('load', () => {
      isMapLoaded.current = true;
      setMapReady(true);
      const clickHandler = createClickHandler();
      currentClickHandler.current = clickHandler;
      map.current!.on('click', clickHandler);
    });
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        isMapLoaded.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !isMapLoaded.current || !currentClickHandler.current) return;
    if (currentClickHandler.current) {
      map.current.off('click', currentClickHandler.current);
    }
    const clickHandler = createClickHandler();
    currentClickHandler.current = clickHandler;
    map.current.on('click', clickHandler);
    return () => {
      if (map.current && currentClickHandler.current) {
        map.current.off('click', currentClickHandler.current);
      }
    };
  }, [createClickHandler]);

  const createMarkerElement = useCallback((color: string) => {
    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.style.cssText = `width:24px;height:24px;background-color:${color};border-radius:50%;border:3px solid white;box-shadow:0 4px 6px -1px rgba(0,0,0,.1);cursor:pointer;position:absolute;transform:translate(-50%,-50%);pointer-events:auto;`;
    const innerDot = document.createElement('div');
    innerDot.style.cssText = `width:8px;height:8px;background-color:white;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);`;
    el.appendChild(innerDot);
    return el;
  }, []);

  const upsertMarker = useCallback((markerRef: React.MutableRefObject<maplibregl.Marker | null>, point: RoutePoint | null, color: string, onRemove: (e: Event) => void, type: 'origin' | 'destination') => {
    if (!map.current || !isMapLoaded.current) return;
    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
    if (!point) return;
    const el = createMarkerElement(color);
    const marker = new maplibregl.Marker({ element: el, anchor: 'center', draggable: true })
      .setLngLat([point.lng, point.lat]).addTo(map.current);
    markerRef.current = marker;
    el.addEventListener('click', onRemove);
    marker.on('dragend', () => {
      if (!markerRef.current) return;
      const lngLat = markerRef.current.getLngLat();
      onPointSelect({ lat: lngLat.lat, lng: lngLat.lng }, type);
    });
  }, [createMarkerElement, onPointSelect]);

  useEffect(() => {
    if (!map.current || !isMapLoaded.current) return;
    upsertMarker(originMarker, origin, '#10B981', handleOriginMarkerClick, 'origin');
    upsertMarker(destinationMarker, destination, '#EF4444', handleDestinationMarkerClick, 'destination');
  }, [origin, destination, upsertMarker, handleOriginMarkerClick, handleDestinationMarkerClick, mapReady]);

  useEffect(() => {
    if (!map.current || !mapReady) return;
    cleanupRouteLayers(map.current);
    routes.forEach((route, index) => {
      if (!route.geometry || !visibleRoutes.includes(route.mode)) return;
      const layerId = `route-${route.mode}-${index}`;
      try {
        const coords = route.geometry.coordinates || [];
        const validCoordinates = filterValidCoordinates(coords);
        if (validCoordinates.length === 0) return;
        addRouteSourceAndLayers(map.current!, layerId, route.color, validCoordinates, isDevTransportMode(route.mode));
      } catch (error) {
        console.error('Error adding route layer:', error, route);
      }
    });
    if (routes.length > 0 && origin && destination && !hasInitialFit.current) {
      try {
        const bounds = buildBoundsForRoutes(routes, visibleRoutes, origin, destination);
        if (bounds) {
          map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
          hasInitialFit.current = true;
        }
      } catch {}
    }
    if (routes.length === 0) {
      hasInitialFit.current = false;
    }
  }, [routes, visibleRoutes, origin, destination, mapReady]);

  const OVERLAY_CONFIGS = [
    { key: 'lez' as const, url: 'https://maps.cartoway.com/styles/low_emission_zone/style.json', prefix: 'overlay-lez-' },
    { key: 'ltz' as const, url: 'https://maps.cartoway.com/styles/limited_traffic_zone/style.json', prefix: 'overlay-ltz-' },
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


