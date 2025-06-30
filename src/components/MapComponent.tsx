/*
 * Copyright (C) 2025 Cartoway
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { RoutePoint, RouteResult } from '../types/route';
import { useTranslation } from '../contexts/TranslationContext';

interface MapComponentProps {
  onPointSelect: (point: RoutePoint | null, type: 'origin' | 'destination') => void;
  origin: RoutePoint | null;
  destination: RoutePoint | null;
  routes: RouteResult[];
  visibleRoutes: string[];
}

export const MapComponent: React.FC<MapComponentProps> = ({
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

  // Memoize marker click handlers
  const handleOriginMarkerClick = useCallback((e: Event) => {
    e.stopPropagation();
    onPointSelect(null, 'origin');
  }, [onPointSelect]);

  const handleDestinationMarkerClick = useCallback((e: Event) => {
    e.stopPropagation();
    onPointSelect(null, 'destination');
  }, [onPointSelect]);

  // Create click handler function
  const createClickHandler = useCallback(() => {
    return (e: maplibregl.MapMouseEvent) => {
      const point: RoutePoint = {
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      };

      // Default behavior: set origin first, then destination
      if (!origin) {
        onPointSelect(point, 'origin');
      } else if (!destination) {
        onPointSelect(point, 'destination');
      } else {
        // Both are set, modify destination by default
        onPointSelect(point, 'destination');
      }
    };
  }, [onPointSelect, origin, destination]);

  // Initialize map only once - no dependencies that change frequently
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [2.3522, 48.8566], // Paris center
      zoom: 10,
    });

    map.current.addControl(new maplibregl.NavigationControl({
      showCompass: false,
      showZoom: true
    }), 'top-right');

    // Wait for map to load before setting the flag
    map.current.on('load', () => {
      isMapLoaded.current = true;

      // Initialize click handler immediately after map loads
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
  }, []); // Empty dependency array - only run once

  // Update click handler when points change
  useEffect(() => {
    if (!map.current || !isMapLoaded.current || !currentClickHandler.current) return;

    // Remove existing click handler
    if (currentClickHandler.current) {
      map.current.off('click', currentClickHandler.current);
    }

    // Add new click handler
    const clickHandler = createClickHandler();
    currentClickHandler.current = clickHandler;
    map.current.on('click', clickHandler);

    return () => {
      if (map.current && currentClickHandler.current) {
        map.current.off('click', currentClickHandler.current);
      }
    };
  }, [createClickHandler]); // Dependencies for click handler

  // Create marker element with proper CSS classes
  const createMarkerElement = (color: string) => {
    const el = document.createElement('div');

    // Use CSS classes instead of inline styles for better performance and positioning
    el.className = 'custom-marker';
    el.style.cssText = `
      width: 24px;
      height: 24px;
      background-color: ${color};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      position: absolute;
      transform: translate(-50%, -50%);
      pointer-events: auto;
    `;

    // Add inner dot
    const innerDot = document.createElement('div');
    innerDot.style.cssText = `
      width: 8px;
      height: 8px;
      background-color: white;
      border-radius: 50%;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;
    el.appendChild(innerDot);

    return el;
  };

  // Update origin marker
  useEffect(() => {
    if (!map.current || !isMapLoaded.current) return;

    // Remove existing marker
    if (originMarker.current) {
      originMarker.current.remove();
      originMarker.current = null;
    }

    // Add new marker if origin exists
    if (origin) {
      const el = createMarkerElement('#10B981'); // Green color for origin

      // Create marker with exact coordinates
      originMarker.current = new maplibregl.Marker({
        element: el,
        anchor: 'center'
      })
        .setLngLat([origin.lng, origin.lat])
        .addTo(map.current);

      // Add click handler to remove origin
      el.addEventListener('click', handleOriginMarkerClick);
    }
  }, [origin, handleOriginMarkerClick]);

  // Update destination marker
  useEffect(() => {
    if (!map.current || !isMapLoaded.current) return;

    // Remove existing marker
    if (destinationMarker.current) {
      destinationMarker.current.remove();
      destinationMarker.current = null;
    }

    // Add new marker if destination exists
    if (destination) {
      const el = createMarkerElement('#EF4444'); // Red color for destination

      // Create marker with exact coordinates
      destinationMarker.current = new maplibregl.Marker({
        element: el,
        anchor: 'center'
      })
        .setLngLat([destination.lng, destination.lat])
        .addTo(map.current);

      // Add click handler to remove destination
      el.addEventListener('click', handleDestinationMarkerClick);
    }
  }, [destination, handleDestinationMarkerClick]);

  // Update routes
  useEffect(() => {
    if (!map.current || !isMapLoaded.current) return;

    // Clean up existing route layers - only if map is loaded and has style
    try {
      const style = map.current.getStyle();
      if (style && style.layers) {
        const existingLayers = style.layers;
        existingLayers.forEach((layer) => {
          if (layer.id.startsWith('route-')) {
            if (map.current!.getLayer(layer.id)) {
              map.current!.removeLayer(layer.id);
            }
            if (map.current!.getSource(layer.id)) {
              map.current!.removeSource(layer.id);
            }
          }
        });
      }
    } catch (error) {
      console.warn('Could not clean up existing layers:', error);
    }

    // Add visible routes
    routes.forEach((route, index) => {
      if (!route.geometry || !visibleRoutes.includes(route.mode)) return;

      const layerId = `route-${route.mode}-${index}`;

      try {
        // Use decoded coordinates
        if (route.geometry.coordinates && route.geometry.coordinates.length > 0) {
          // Validate coordinates before adding to map
          const validCoordinates = route.geometry.coordinates.filter(coord => {
            if (!Array.isArray(coord) || coord.length < 2) return false;
            const lng = coord[0];
            const lat = coord[1];
            return typeof lng === 'number' && typeof lat === 'number' &&
                   lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
          });

          if (validCoordinates.length === 0) {
            return;
          }

          map.current!.addSource(layerId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {
                mode: route.mode
              },
              geometry: {
                type: 'LineString',
                coordinates: validCoordinates,
              },
            },
          });

          // Add outline layer first (background)
          map.current!.addLayer({
            id: `${layerId}-outline`,
            type: 'line',
            source: layerId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#ffffff',
              'line-width': 8,
              'line-opacity': 0.9,
            },
          });

          map.current!.addLayer({
            id: layerId,
            type: 'line',
            source: layerId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': route.color,
              'line-width': 6,
              'line-opacity': 0.9,
            },
          });
        }
      } catch (error) {
        console.error('Error adding route layer:', error, route);
      }
    });

    // Fit map to show all routes only when routes are first calculated
    if (routes.length > 0 && origin && destination && !hasInitialFit.current) {
      try {
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([origin.lng, origin.lat]);
        bounds.extend([destination.lng, destination.lat]);

        routes.forEach((route) => {
          if (route.geometry && visibleRoutes.includes(route.mode) && route.geometry.coordinates) {
            route.geometry.coordinates.forEach((coord) => {
              if (Array.isArray(coord) && coord.length >= 2) {
                const lng = coord[0];
                const lat = coord[1];

                // Validate coordinates before extending bounds
                if (typeof lng === 'number' && typeof lat === 'number' &&
                    lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
                  bounds.extend([lng, lat]);
                }
              }
            });
          }
        });

        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15
        });
        hasInitialFit.current = true;
      } catch (error) {
        console.error('Error fitting bounds:', error);
      }
    }

    // Reset the flag when routes are cleared
    if (routes.length === 0) {
      hasInitialFit.current = false;
    }
  }, [routes, visibleRoutes, origin, destination]);

  const getInstructionText = () => {
    if (!origin && !destination) {
      return t('map.instructions.selectOrigin');
    } else if (origin && !destination) {
      return t('map.instructions.selectDestination');
    } else if (origin && destination) {
      return t('map.instructions.modifyDestination');
    }
    return '';
  };

  return (
    <div className="relative h-full">
      <div ref={mapContainer} className="h-full w-full rounded-lg overflow-hidden shadow-lg" />

      {/* Click instruction overlay */}
      <div className="hidden lg:block absolute top-4 left-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs">
        <p className="text-sm font-medium text-gray-800">
          {getInstructionText()}
        </p>
        {(origin || destination) && (
          <p className="text-xs text-gray-600 mt-1">
            {t('map.instructions.removeMarker')}
          </p>
        )}
      </div>

      {/* Legend */}
      {(origin || destination) && (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="text-xs font-medium text-gray-700 mb-2">{t('map.legend.title')}</div>
          <div className="space-y-1">
            {origin && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                <span className="text-xs text-gray-600">{t('map.legend.origin')}</span>
              </div>
            )}
            {destination && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                <span className="text-xs text-gray-600">{t('map.legend.destination')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
