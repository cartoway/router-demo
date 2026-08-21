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

import * as maplibregl from 'maplibre-gl';
import type { LayerSpecification, SourceSpecification } from '@maplibre/maplibre-gl-style-spec';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { RoutePoint, RouteResult } from '../types/route';

maplibregl.setWorkerUrl(maplibreWorkerUrl);

function isValidLngLat(lng: number, lat: number): boolean {
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

export function filterValidCoordinates(coordinates: [number, number][]): [number, number][] {
  return coordinates.filter((coord) => {
    if (!Array.isArray(coord) || coord.length < 2) return false;
    const [lng, lat] = coord;
    return isValidLngLat(lng, lat);
  });
}

export function cleanupRouteLayers(map: maplibregl.Map): void {
  try {
    const style = map.getStyle();
    if (!style || !style.layers) return;
    // First pass: remove all route layers (including outline/hit sub-layers)
    style.layers.forEach((layer) => {
      if (!layer.id.startsWith('route-')) return;
      if (map.getLayer(layer.id)) map.removeLayer(layer.id);
    });
    // Second pass: remove sources (now safe, no layers reference them)
    style.layers.forEach((layer) => {
      if (!layer.id.startsWith('route-')) return;
      const isSubLayer = layer.id.endsWith('-outline') || layer.id.endsWith('-hit');
      if (!isSubLayer && map.getSource(layer.id)) map.removeSource(layer.id);
    });
  } catch {}
}

export function addRouteSourceAndLayers(
  map: maplibregl.Map,
  layerId: string,
  color: string,
  coordinates: [number, number][],
  dashed: boolean
): void {
  map.addSource(layerId, {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates,
      },
    },
  });

  map.addLayer({
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

  map.addLayer({
    id: layerId,
    type: 'line',
    source: layerId,
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': color,
      'line-width': 6,
      'line-opacity': 0.9,
      ...(dashed ? { 'line-dasharray': [2, 2] as unknown as number[] } : {}),
    },
  });
}

export async function addMapOverlay(map: maplibregl.Map, url: string, prefix: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch overlay style: ${response.status}`);
  const style = await response.json();
  for (const [id, source] of Object.entries(style.sources || {})) {
    const prefixedId = prefix + id;
    if (!map.getSource(prefixedId)) {
      map.addSource(prefixedId, source as SourceSpecification);
    }
  }
  for (const layer of (style.layers || []) as LayerSpecification[]) {
    const prefixedLayerId = prefix + layer.id;
    if (!map.getLayer(prefixedLayerId)) {
      const modifiedLayer = {
        ...layer,
        id: prefixedLayerId,
        ...('source' in layer && layer.source ? { source: prefix + layer.source } : {}),
      } as LayerSpecification;
      map.addLayer(modifiedLayer);
    }
  }
}

export function removeMapOverlay(map: maplibregl.Map, prefix: string): void {
  try {
    const style = map.getStyle();
    if (!style) return;
    (style.layers || []).forEach((layer) => {
      if (layer.id.startsWith(prefix) && map.getLayer(layer.id)) map.removeLayer(layer.id);
    });
    Object.keys(style.sources || {}).forEach((id) => {
      if (id.startsWith(prefix) && map.getSource(id)) map.removeSource(id);
    });
  } catch {}
}

export function buildBoundsForRoutes(
  routes: RouteResult[],
  visibleModes: string[],
  origin?: RoutePoint | null,
  destination?: RoutePoint | null
): maplibregl.LngLatBounds | null {
  const bounds = new maplibregl.LngLatBounds();
  let extended = false;

  if (origin) {
    bounds.extend([origin.lng, origin.lat]);
    extended = true;
  }
  if (destination) {
    bounds.extend([destination.lng, destination.lat]);
    extended = true;
  }

  routes.forEach((route) => {
    if (!route.geometry || !visibleModes.includes(route.mode) || !route.geometry.coordinates) return;
    filterValidCoordinates(route.geometry.coordinates).forEach(([lng, lat]) => {
      bounds.extend([lng, lat]);
      extended = true;
    });
  });

  return extended ? bounds : null;
}
