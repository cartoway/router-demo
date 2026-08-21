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

// Runtime configuration, loaded from /env.js (see .env.js / .env.example.js).
// The file is optional: when absent (or partially filled), code defaults apply.

interface RuntimeConfig {
  ROUTER_API_KEY?: string;
  ROUTER_API_RUNTIME_URL?: string;
  ENABLED_TRANSPORT_MODES?: string[] | string;
  ACTIVE_TRANSPORT_MODES?: string[] | string;
  GEOCODER_API_URL?: string;
  GEOCODER_API_KEY?: string;
  ISOLINE_MAX_PROFILES?: number | string;
}

declare global {
  interface Window {
    config?: RuntimeConfig;
  }
}

const config: RuntimeConfig =
  typeof window !== 'undefined' && window.config ? window.config : {};

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

const toModeList = (value: unknown): string[] | null => {
  if (Array.isArray(value)) {
    const modes = value.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
    return modes.length > 0 ? modes : null;
  }
  const raw = toStringValue(value);
  if (!raw) return null;
  const modes = raw.split(',').map((mode) => mode.trim()).filter((mode) => mode.length > 0);
  return modes.length > 0 ? modes : null;
};

export const getRouterApiKey = (): string =>
  toStringValue(config.ROUTER_API_KEY) ?? 'demo';

export const getRouterApiRuntimeUrl = (): string =>
  toStringValue(config.ROUTER_API_RUNTIME_URL) ?? 'https://router.cartoway.com';

export const getGeocoderApiUrl = (): string | undefined =>
  toStringValue(config.GEOCODER_API_URL);

export const getGeocoderApiKey = (): string | undefined =>
  toStringValue(config.GEOCODER_API_KEY);

export const getEnabledTransportModes = (): string[] | null =>
  toModeList(config.ENABLED_TRANSPORT_MODES);

export const getActiveTransportModes = (): string[] | null =>
  toModeList(config.ACTIVE_TRANSPORT_MODES);

export const getIsolineMaxProfiles = (): number => {
  const raw = Number(toStringValue(config.ISOLINE_MAX_PROFILES));
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 6;
};
