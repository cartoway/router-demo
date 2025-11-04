/*
 * Cartoway Geocoder service
 * - Forward geocoding search
 * - Reads VITE_GEOCODER_API_URL and VITE_GEOCODER_API_KEY
 */

export interface GeocodeSuggestion {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export interface GeocodeOptions {
  country?: string;
}

import type { ApiRequest } from '../types/api';

const GEOCODER_BASE_URL = import.meta.env.VITE_GEOCODER_API_URL;
const GEOCODER_API_KEY = import.meta.env.VITE_GEOCODER_API_KEY;

function buildSearchUrl(query: string, opts?: GeocodeOptions): string {
  if (!GEOCODER_BASE_URL) {
    throw new Error('VITE_GEOCODER_API_URL is not defined');
  }
  const url = new URL(GEOCODER_BASE_URL.replace(/\/$/, ''));
  if (!/\/.+/.test(url.pathname)) {
    url.pathname = '/0.1/geocode';
  }
  const params = url.searchParams;
  params.set('query', query);
  if (GEOCODER_API_KEY) params.set('api_key', GEOCODER_API_KEY);
  if (opts?.country) params.set('country', opts.country);
  return url.toString();
}

export async function geocodeSearch(
  query: string,
  signal?: AbortSignal,
  opts?: GeocodeOptions,
  onRequestLog?: (request: ApiRequest) => void
): Promise<GeocodeSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const url = buildSearchUrl(trimmed, opts);

  const requestBase: ApiRequest = {
    id: `geocode_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    method: 'GET',
    url,
    status: 'pending',
    timestamp: new Date(),
  };
  onRequestLog?.(requestBase);

  const start = Date.now();
  try {
    const res = await fetch(url, { signal, headers: { 'Accept': 'application/json' } });
    const duration = Date.now() - start;
    if (!res.ok) {
      onRequestLog?.({ ...requestBase, status: 'error', duration, error: `HTTP ${res.status}` });
      throw new Error(`Geocoder HTTP ${res.status}`);
    }
    const data = await res.json();
    onRequestLog?.({ ...requestBase, status: 'success', duration, responseData: data });

    const suggestions: GeocodeSuggestion[] = [];

    if (Array.isArray(data?.features)) {
      for (const f of data.features) {
        const coords = f?.geometry?.coordinates;
        const g = f?.properties?.geocoding ?? {};
        const label = g?.label || f?.properties?.label || f?.properties?.name || '';
        const lng = Array.isArray(coords) ? Number(coords[0]) : NaN;
        const lat = Array.isArray(coords) ? Number(coords[1]) : NaN;
        const id = String(g?.id ?? f?.id ?? `${lng},${lat}`);
        if (label && Number.isFinite(lat) && Number.isFinite(lng)) {
          suggestions.push({ id, label, lat, lng });
        }
      }
    } else if (Array.isArray(data?.results)) {
      for (const r of data.results) {
        const label = r?.label || r?.name || '';
        const lat = Number(r?.lat ?? r?.latitude);
        const lng = Number(r?.lng ?? r?.lon ?? r?.longitude);
        if (label && Number.isFinite(lat) && Number.isFinite(lng)) {
          suggestions.push({ id: String(r?.id ?? `${lng},${lat}`), label, lat, lng });
        }
      }
    }

    return suggestions;
  } catch (e) {
    // If aborted, still log error with message
    onRequestLog?.({ ...requestBase, status: 'error', duration: Date.now() - start, error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}
