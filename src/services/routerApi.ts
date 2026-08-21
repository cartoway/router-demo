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

import { RoutePoint, RouteOptions, CartowayResponse, CartowayFeature, IsolineResult, Dimension } from '../types/route';
import type { ApiRequest } from '../types/api';
import polyline from '@mapbox/polyline';
import { getRouterApiRuntimeUrl, getRouterApiKey } from '../config/env';

const ROUTER_API_RUNTIME_URL = getRouterApiRuntimeUrl();

// Module-level cache for capability endpoint (the result is stable across the session)
type CapabilityRouteEntry = {
  mode: string;
  support_motorway?: boolean;
  support_toll?: boolean;
  support_low_emission_zone?: boolean;
  support_track?: boolean;
};
type CapabilityIsolineEntry = {
  mode: string;
  dimensions?: unknown[];
};
type CapabilityResponse = {
  route?: CapabilityRouteEntry[];
  isoline?: CapabilityIsolineEntry[];
};
let capabilityRawPromise: Promise<CapabilityResponse> | null = null;
let capabilityRawData: CapabilityResponse | null = null;
async function fetchCapabilityRaw(apiKey: string): Promise<CapabilityResponse> {
  if (capabilityRawData) return capabilityRawData;
  if (capabilityRawPromise) return capabilityRawPromise;
  const url = `${ROUTER_API_RUNTIME_URL}/0.1/capability?api_key=${encodeURIComponent(apiKey)}`;
  capabilityRawPromise = fetch(url, { headers: { 'Accept': 'application/json' } })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json() as Promise<CapabilityResponse>;
    })
    .then((data) => {
      capabilityRawData = data;
      return data;
    })
    .finally(() => {
      // Keep promise for in-flight dedupe; keep data for subsequent immediate returns
    });
  return capabilityRawPromise;
}

// Shared runtime capability fetch (single cached request per session).
// Used by transportModes init and RouterApiService instances alike.
export function fetchRouterCapabilities(): Promise<CapabilityResponse> {
  return fetchCapabilityRaw(getRouterApiKey());
}


interface HttpError extends Error {
  isHttpError: true;
}

export class RouterApiService {
  private apiKey: string;
  private onRequestLog?: (request: ApiRequest) => void;
  private translate?: (key: string) => string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || getRouterApiKey();
  }

  // Capability for isolines: which dimensions are available per mode
  async getIsolineCapabilities(): Promise<Record<string, Array<'time' | 'distance'>>> {
    const data = await fetchCapabilityRaw(this.apiKey);
    const map: Record<string, Array<'time' | 'distance'>> = {};
    const arr = Array.isArray(data?.isoline) ? data.isoline : [];
    for (const entry of arr) {
      if (!entry || typeof entry.mode !== 'string') continue;
      const dims = Array.isArray(entry.dimensions) ? entry.dimensions : [];
      const normalized = dims
        .map((d: unknown) => (d === 'time' || d === 'distance' ? d : null))
        .filter((d: 'time' | 'distance' | null): d is 'time' | 'distance' => d !== null);
      // Ensure unique, preserve order (prefer time first if present)
      const unique: Array<'time' | 'distance'> = [];
      ['time', 'distance'].forEach((d) => {
        if (normalized.includes(d as 'time' | 'distance')) unique.push(d as 'time' | 'distance');
      });
      map[entry.mode] = unique;
    }
    return map;
  }
  setRequestLogger(callback: (request: ApiRequest) => void) {
    this.onRequestLog = callback;
  }

  setTranslator(translate: (key: string) => string) {
    this.translate = translate;
  }

  private logRequest(request: ApiRequest) {
    if (this.onRequestLog) {
      this.onRequestLog(request);
    }
  }

  private getDocumentedErrorMessage(status: number): string {
    const errorMessages: Record<number, string> = {
      204: 'http204',
      400: 'http400',
      401: 'http401',
      404: 'http404',
      405: 'http405',
      417: 'http417',
      500: 'http500'
    };

    const errorKey = errorMessages[status];
    if (errorKey && this.translate) {
      return this.translate(`errors.${errorKey}`);
    }

    return `HTTP error! status: ${status}`;
  }

  async calculateRoute(
    origin: RoutePoint,
    destination: RoutePoint,
    options: RouteOptions
  ): Promise<CartowayResponse> {

    // Format coordinates as: lat1,lng1,[via...],lat2,lng2
    const viaParts = (options.viapoints ?? [])
      .map(v => `${v.lat},${v.lng}`).join(',');
    const locs = viaParts
      ? `${origin.lat},${origin.lng},${viaParts},${destination.lat},${destination.lng}`
      : `${origin.lat},${origin.lng},${destination.lat},${destination.lng}`;

    const params = new URLSearchParams({
      api_key: this.apiKey,
      mode: options.mode,
      locs: locs,
      geometry: options.geometry ? 'true' : 'false',
      dimension: options.dimension ?? 'time',
      precision: '6'
    });

    // Filter options based on profile capabilities
    const caps = await this.getCapabilities();
    const modeCaps = caps[options.mode] || { motorway: false, toll: false, low_emission_zone: false, track: false };
    const sentOptions: { motorway?: boolean; toll?: boolean; low_emission_zone?: boolean; track?: boolean } = {};

    // Append optional toggles only if supported by the profile
    if (typeof options.motorway === 'boolean' && modeCaps.motorway) {
      params.set('motorway', options.motorway ? 'true' : 'false');
      sentOptions.motorway = options.motorway;
    }
    if (typeof options.toll === 'boolean' && modeCaps.toll) {
      params.set('toll', options.toll ? 'true' : 'false');
      sentOptions.toll = options.toll;
    }
    if (typeof options.low_emission_zone === 'boolean' && modeCaps.low_emission_zone) {
      params.set('low_emission_zone', options.low_emission_zone ? 'true' : 'false');
      sentOptions.low_emission_zone = options.low_emission_zone;
    }
    if (typeof options.track === 'boolean' && modeCaps.track) {
      params.set('track', options.track ? 'true' : 'false');
      sentOptions.track = options.track;
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    const url = `${ROUTER_API_RUNTIME_URL}/0.1/routes?${params}`;

    // Log request start
    const request: ApiRequest = {
      id: requestId,
      timestamp: new Date(),
      method: 'GET',
      url,
      requestData: {
        origin,
        destination,
        options: { ...options, ...sentOptions },
        params: Object.fromEntries(params.entries())
      },
      status: 'pending'
    };
    this.logRequest(request);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorMessage = this.getDocumentedErrorMessage(response.status);

        const errorRequest: ApiRequest = {
          ...request,
          status: 'rejected',
          duration,
          error: errorMessage
        };
        this.logRequest(errorRequest);

        // Create a custom error with a flag to identify it as our HTTP error
        const httpError = new Error(errorMessage) as HttpError;
        httpError.isHttpError = true;
        throw httpError;
      }

      const data = await response.json();

      // Log successful request
      const successRequest: ApiRequest = {
        ...request,
        status: 'success',
        duration,
        responseData: data
      };
      this.logRequest(successRequest);

      return data;
    } catch (error) {
      if (error instanceof Error && (error as HttpError).isHttpError) {
        throw error;
      }


      const duration = Date.now() - startTime;
      const errorRequest: ApiRequest = {
        ...request,
        status: 'error',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      this.logRequest(errorRequest);
      throw error;
    }
  }

  // Helper function to convert Cartoway response to RouteResult format
  convertToRouteResult(feature: CartowayFeature, mode: string): {
    mode: string;
    duration: number;
    distance: number;
    geometry: {
      coordinates: [number, number][];
      type: string;
    };
  } {
    try {
      // Decode polyline to coordinates using @mapbox/polyline
      const decodedCoordinates = polyline.decode(feature.geometry.polylines, 6);

      // @mapbox/polyline returns [lat, lng] format, convert to [lng, lat] for GeoJSON
      // But we still need to validate and fix invalid coordinates
      const coordinates: [number, number][] = decodedCoordinates.map((coord) => {
        const [lat, lng] = coord;

        return [lng, lat]; // Convert to [lng, lat] for GeoJSON
      });

      return {
        mode,
        duration: feature.properties.router.total_time,
        distance: feature.properties.router.total_distance,
        geometry: {
          coordinates,
          type: 'LineString',
        },
      };
    } catch {
      // Fallback: return empty geometry
      return {
        mode,
        duration: feature.properties.router.total_time,
        distance: feature.properties.router.total_distance,
        geometry: {
          coordinates: [],
          type: 'LineString',
        },
      };
    }
  }

  async calculateIsoline(
    loc: RoutePoint,
    opts: {
      mode: string;
      dimension: Dimension;
      size: number;
      speed_multiplier?: number;
      motorway?: boolean;
      toll?: boolean;
      low_emission_zone?: boolean;
      track?: boolean;
    }
  ): Promise<IsolineResult> {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      mode: opts.mode,
      loc: `${loc.lat},${loc.lng}`,
      dimension: opts.dimension,
      size: String(opts.size),
      speed_multiplier: String(opts.speed_multiplier ?? 1),
      precision: '6',
    });
    // Optional routing-like toggles
    const caps = await this.getCapabilities();
    const modeCaps = caps[opts.mode] || { motorway: false, toll: false, low_emission_zone: false, track: false };
    const sentOptions: { motorway?: boolean; toll?: boolean; low_emission_zone?: boolean; track?: boolean } = {};
    if (typeof opts.motorway === 'boolean' && modeCaps.motorway) {
      params.set('motorway', opts.motorway ? 'true' : 'false');
      sentOptions.motorway = opts.motorway;
    }
    if (typeof opts.toll === 'boolean' && modeCaps.toll) {
      params.set('toll', opts.toll ? 'true' : 'false');
      sentOptions.toll = opts.toll;
    }
    if (typeof opts.low_emission_zone === 'boolean' && modeCaps.low_emission_zone) {
      params.set('low_emission_zone', opts.low_emission_zone ? 'true' : 'false');
      sentOptions.low_emission_zone = opts.low_emission_zone;
    }
    if (typeof opts.track === 'boolean' && modeCaps.track) {
      params.set('track', opts.track ? 'true' : 'false');
      sentOptions.track = opts.track;
    }

    const url = `${ROUTER_API_RUNTIME_URL}/0.1/isoline?${params}`;

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    const request: ApiRequest = {
      id: requestId,
      timestamp: new Date(),
      method: 'GET',
      url,
      requestData: {
        loc,
        options: sentOptions,
        params: Object.fromEntries(params.entries())
      },
      status: 'pending'
    };
    this.logRequest(request);

    const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
    const duration = Date.now() - startTime;

    if (!res.ok) {
      const errorMessage = this.getDocumentedErrorMessage(res.status);
      const errorRequest: ApiRequest = { ...request, status: 'rejected', duration, error: errorMessage };
      this.logRequest(errorRequest);
      const httpError = new Error(errorMessage) as Error & { isHttpError?: boolean };
      httpError.isHttpError = true;
      throw httpError;
    }
    const data = await res.json();
    const successRequest: ApiRequest = { ...request, status: 'success', duration, responseData: data };
    this.logRequest(successRequest);

    // Expect FeatureCollection with first feature geometry polygon/multipolygon
    const feature = Array.isArray(data?.features) ? data.features[0] : undefined;
    const geometry = feature?.geometry;

    // Some backends may return an encoded polyline for the isoline boundary.
    // Normalize to a GeoJSON Polygon or MultiPolygon with [lng,lat] coordinates.
    const toLngLat = (arr: [number, number][]) => arr.map(([lat, lng]) => [lng, lat] as [number, number]);
    const ensureClosedRing = (ring: [number, number][]) => {
      if (ring.length === 0) return ring;
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        return [...ring, first];
      }
      return ring;
    };

    let normalized:
      | { type: 'Polygon'; coordinates: number[][][] }
      | { type: 'MultiPolygon'; coordinates: number[][][][] } = {
      type: 'Polygon',
      coordinates: []
    };

    if (geometry?.polylines && typeof geometry.polylines === 'string') {
      // Decode the polyline to a ring and wrap as a Polygon
      try {
        const decoded = polyline.decode(geometry.polylines, 6) as [number, number][];
        const ring = ensureClosedRing(toLngLat(decoded));
        normalized = { type: 'Polygon', coordinates: [ring as unknown as number[][]] };
      } catch {
        normalized = { type: 'Polygon', coordinates: [] };
      }
    } else if (geometry?.type === 'LineString' && Array.isArray(geometry.coordinates)) {
      // Convert LineString ring to Polygon
      const ring = ensureClosedRing(geometry.coordinates as [number, number][]);
      normalized = { type: 'Polygon', coordinates: [ring as unknown as number[][]] };
    } else if (geometry?.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
      normalized = { type: 'Polygon', coordinates: geometry.coordinates as number[][][] };
    } else if (geometry?.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
      normalized = { type: 'MultiPolygon', coordinates: geometry.coordinates as number[][][][] };
    } else {
      normalized = { type: 'Polygon', coordinates: [] };
    }

    return {
      mode: opts.mode,
      dimension: opts.dimension,
      size: opts.size,
      geometry: normalized,
      color: '#3B82F6',
    };
  }

  async calculateMultipleRoutes(
    origin: RoutePoint,
    destination: RoutePoint,
    modes: string[],
    commonOptions?: Partial<Pick<RouteOptions, 'motorway' | 'toll' | 'low_emission_zone' | 'track'>>
  ): Promise<CartowayResponse[]> {
    const promises = modes.map(mode =>
      this.calculateRoute(origin, destination, {
        mode,
        geometry: true,
        ...commonOptions,
      })
    );

    const results = await Promise.allSettled(promises);
    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<CartowayResponse> =>
        result.status === 'fulfilled'
      )
      .map(result => result.value);

    // If all requests failed, throw an error
    if (successfulResults.length === 0 && results.length > 0) {
      const firstError = results.find(result => result.status === 'rejected');
      if (firstError && firstError.status === 'rejected') {
        // Extract the error message from the Error object
        const errorMessage = firstError.reason instanceof Error
          ? firstError.reason.message
          : String(firstError.reason);
        throw new Error(errorMessage);
      }
      throw new Error(this.translate ? this.translate('errors.allRoutesFailed') : 'All route calculations failed');
    }

    return successfulResults;
  }

  async getCapabilities(): Promise<Record<string, { motorway: boolean; toll: boolean; low_emission_zone: boolean; track: boolean }>> {
    const data = await fetchCapabilityRaw(this.apiKey);
    const map: Record<string, { motorway: boolean; toll: boolean; low_emission_zone: boolean; track: boolean }> = {};
    const arr = Array.isArray(data?.route) ? data.route : [];
    for (const entry of arr) {
      if (!entry || typeof entry.mode !== 'string') continue;
      map[entry.mode] = {
        motorway: Boolean(entry.support_motorway),
        toll: Boolean(entry.support_toll),
        low_emission_zone: Boolean(entry.support_low_emission_zone),
        track: Boolean(entry.support_track),
      };
    }
    return map;
  }
}
