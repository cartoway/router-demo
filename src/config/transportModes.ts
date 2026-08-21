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

import {
  faBicycle,
  faCar,
  faMotorcycle,
  faPersonWalking,
  faToolbox,
  faTruck,
  faTruckRampBox,
  faVanShuttle,
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { getEnabledTransportModes, getActiveTransportModes } from './env';
import { fetchRouterCapabilities } from '../services/routerApi';

export interface TransportMode {
  id: string;
  icon: IconDefinition;
  color: string;
  enabled: boolean;
}

const ALL_MODES_BASE: Array<{ id: string; icon: IconDefinition; color: string }> = [
  { id: 'car', icon: faCar, color: '#2563EB' },
  { id: 'cargo_ebike', icon: faTruckRampBox, color: '#059669' },
  { id: 'scooter', icon: faMotorcycle, color: '#8B5CF6' },
  { id: 'van', icon: faVanShuttle, color: '#FCC419' },
  { id: 'truck_75', icon: faTruck, color: '#7C2D12' },
  { id: 'truck_10', icon: faTruck, color: '#3B82F6' },
  { id: 'truck_12', icon: faTruck, color: '#991B1B' },
  { id: 'truck_19', icon: faTruck, color: '#DC2626' },
  { id: 'truck_26', icon: faTruck, color: '#B91C1C' },
  { id: 'truck_32', icon: faTruck, color: '#DC2626' },
  { id: 'truck_44', icon: faTruck, color: '#EF4444' },
  { id: 'bicycle', icon: faBicycle, color: '#16A34A' },
  { id: 'ebike', icon: faMotorcycle, color: '#059669' },
  { id: 'foot', icon: faPersonWalking, color: '#6B7280' },
];

// Runtime state: which modes the router reports as available, and which of
// them are unknown to this app (rendered with a dev icon and flashy color).
// Defaults are optimistic (all known base modes) and are replaced by
// initTransportModes() with the capabilities fetched from the configured API.
let availableModeIds: string[] = ALL_MODES_BASE.map((mode) => mode.id);
let unknownModeIds: string[] = [];

const DEV_MODE_COLOR = '#FF00AA';

// Get enabled modes from runtime config (ENABLED_TRANSPORT_MODES in /env.js)
const computeEnabledModes = (): string[] => {
  const configModes = getEnabledTransportModes();

  if (!configModes) {
    // If no config provided, enable ALL modes available on the router
    return [...availableModeIds];
  }

  // Only keep config-specified modes that are available on the router
  return configModes.filter((id: string) => availableModeIds.includes(id));
};

// Get active modes from runtime config (ACTIVE_TRANSPORT_MODES in /env.js, modes to be pre-selected)
const computeActiveModes = (): string[] => {
  const configModes = getActiveTransportModes();

  if (!configModes) {
    // Default active modes if no configuration is set
    return ['car', 'cargo_ebike'];
  }

  return configModes;
};

// Create transport modes array respecting the order from ENABLED_TRANSPORT_MODES
const createOrderedTransportModes = (enabledIds: string[]): TransportMode[] => {
  // Append unknown modes with dev icon and flashy color
  const unknownModeEntries = unknownModeIds.map((id: string) => {
    return { id, icon: faToolbox as IconDefinition, color: DEV_MODE_COLOR };
  });

  const allModes = [...ALL_MODES_BASE, ...unknownModeEntries];

  // Create a map for quick lookup
  const modesMap = allModes.reduce((acc, mode) => {
    acc[mode.id] = mode;
    return acc;
  }, {} as Record<string, typeof allModes[0]>);

  // Build ordered array based on ENABLED_TRANSPORT_MODES
  const orderedModes: TransportMode[] = [];

  // First, add modes in the order specified by ENABLED_TRANSPORT_MODES
  enabledIds.forEach(modeId => {
    const mode = modesMap[modeId];
    if (mode) {
      orderedModes.push({
        ...mode,
        enabled: true
      });
    }
  });

  // Then, add any remaining modes that weren't in ENABLED_TRANSPORT_MODES (disabled)
  allModes.forEach(mode => {
    if (!enabledIds.includes(mode.id)) {
      orderedModes.push({
        ...mode,
        enabled: false
      });
    }
  });

  return orderedModes;
};

export let TRANSPORT_MODES: TransportMode[] = [];
export let TRANSPORT_MODES_MAP: Record<string, TransportMode> = {};
export let ENABLED_TRANSPORT_MODES: TransportMode[] = [];
export let ACTIVE_TRANSPORT_MODES: string[] = [];
export let ROUTE_COLORS: Record<string, string> = {};

const refreshTransportModes = (): void => {
  TRANSPORT_MODES = createOrderedTransportModes(computeEnabledModes());

  // Create a map for quick lookup
  TRANSPORT_MODES_MAP = TRANSPORT_MODES.reduce((acc, mode) => {
    acc[mode.id] = mode;
    return acc;
  }, {} as Record<string, TransportMode>);

  // Get only enabled modes
  ENABLED_TRANSPORT_MODES = TRANSPORT_MODES.filter(mode => mode.enabled);

  // Export colors map for backward compatibility
  ROUTE_COLORS = TRANSPORT_MODES.reduce((acc, mode) => {
    acc[mode.id] = mode.color;
    return acc;
  }, {} as Record<string, string>);
};

refreshTransportModes();
ACTIVE_TRANSPORT_MODES = computeActiveModes();

/**
 * Fetch the router capabilities from the configured runtime API and rebuild
 * the transport mode lists accordingly. Must be awaited before the first
 * React render; on failure the optimistic defaults are kept.
 */
export async function initTransportModes(): Promise<void> {
  try {
    const capabilities = await fetchRouterCapabilities();
    const routeEntries = Array.isArray(capabilities?.route) ? capabilities.route : [];
    const serverModes = routeEntries
      .map((entry) => entry?.mode)
      .filter((mode): mode is string => typeof mode === 'string' && mode.trim().length > 0)
      .map((mode) => mode.trim());

    availableModeIds = serverModes;
    unknownModeIds = serverModes.filter(
      (id) => !ALL_MODES_BASE.some((base) => base.id === id)
    );

    ACTIVE_TRANSPORT_MODES = computeActiveModes();
    refreshTransportModes();
  } catch (error) {
    console.warn('Failed to load router capabilities; using default transport modes.', error);
  }
}

// Helper functions
export const getModeLabel = (modeId: string, t?: (key: string) => string): string => {
  if (isDevTransportMode(modeId)) {
    return modeId;
  }
  if (t) {
    return t(`transportModes.${modeId}`) || modeId;
  }
  return modeId;
};

export const getModeColor = (modeId: string): string => {
  return TRANSPORT_MODES_MAP[modeId]?.color || '#6B7280';
};

export const getModeIcon = (modeId: string) => {
  return TRANSPORT_MODES_MAP[modeId]?.icon;
};

export const isModeEnabled = (modeId: string): boolean => {
  return TRANSPORT_MODES_MAP[modeId]?.enabled || false;
};

export const isDevTransportMode = (modeId: string): boolean => {
  return unknownModeIds.includes(modeId);
};

// Fuel price per liter in euros
export const FUEL_PRICE_PER_LITER = 2.000;

// Fuel consumption in liters per 100 km per vehicle type
export const FUEL_CONSUMPTION: Record<string, number> = {
  car:      7,
  scooter:  3,
  van:      9,
  truck_75: 12,
  truck_10: 15,
  truck_12: 17,
  truck_19: 22,
  truck_26: 28,
  truck_32: 34,
  truck_44: 42,
  cargo_ebike: 0,
  bicycle:  0,
  ebike:    0,
  foot:     0,
};

export const calculateFuelCost = (modeId: string, distanceMeters: number): number | undefined => {
  const consumption = FUEL_CONSUMPTION[modeId];
  if (consumption === undefined) return undefined;
  const liters = consumption * (distanceMeters / 1000) / 100;
  return Math.round(liters * FUEL_PRICE_PER_LITER * 100) / 100; // euros
};

// CO2 emission factor in kilograms per liter of fuel
// https://agirpourlatransition.ademe.fr/particuliers/evaluer-son-impact/calculer-empreinte-carbone/calculer-emissions-carbone-trajets
export const CO2_EMISSION_PER_LITER = 2.640;

export const calculateCo2 = (modeId: string, distanceMeters: number): number | undefined => {
  const consumption = FUEL_CONSUMPTION[modeId];
  if (consumption === undefined) return undefined;
  const liters = consumption * (distanceMeters / 1000) / 100;
  return Math.round(liters * CO2_EMISSION_PER_LITER * 100) / 100; // kg
};

// Parking time in seconds per vehicle type
export const PARKING_TIMES: Record<string, number> = {
  car:      7 * 60,
  van:      7 * 60,
  scooter:  2 * 60,
  truck_75: 7 * 60,
  truck_10: 7 * 60,
  truck_12: 7 * 60,
  truck_19: 7 * 60,
  truck_26: 7 * 60,
  truck_32: 7 * 60,
  truck_44: 7 * 60,
};

