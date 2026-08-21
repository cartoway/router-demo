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
import unknownModes from './unknownModes.json';
import availableModes from './availableModes.json';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { getEnabledTransportModes, getActiveTransportModes } from './env';

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

// Get enabled modes from runtime config (ENABLED_TRANSPORT_MODES in /env.js)
const getEnabledModesFromEnv = (): string[] => {
  const envModes = getEnabledTransportModes();

  // Build unknown IDs list (strings only)
  const unknownIds = (Array.isArray(unknownModes) ? unknownModes : []).filter(
    (id: unknown): id is string => typeof id === 'string'
  );

  // Available modes (from routercapabilities)
  const availableIds = (Array.isArray(availableModes) ? availableModes : []).filter(
    (id: unknown): id is string => typeof id === 'string'
  );

  if (!envModes) {
    // If no env provided, enable ALL available modes: known available + unknown
    const all = [...availableIds, ...unknownIds];
    return all.filter((id, idx) => all.indexOf(id) === idx);
  }

  // Only keep env-specified modes that are available
  const requested = envModes;

  const filtered = requested.filter((id: string) => availableIds.includes(id) || unknownIds.includes(id));
  return filtered;
};

// Get active modes from runtime config (ACTIVE_TRANSPORT_MODES in /env.js, modes to be pre-selected)
const getActiveModesFromEnv = (): string[] => {
  const envModes = getActiveTransportModes();

  if (!envModes) {
    // Default active modes if no environment variable is set
    return ['car', 'cargo_ebike'];
  }

  return envModes;
};

const enabledModesFromEnv = getEnabledModesFromEnv();
const activeModesFromEnv = getActiveModesFromEnv();

// Create transport modes array respecting the order from ENABLED_TRANSPORT_MODES
const createOrderedTransportModes = (): TransportMode[] => {
  // Append unknown modes with dev icon and flashy color
  const devColor = '#FF00AA';
  const unknownEntries = Array.isArray(unknownModes) ? unknownModes : [];

  const unknownModeEntries = unknownEntries
    .filter((id: unknown): id is string => typeof id === 'string')
    .map((id: string) => {
      // No prefix/base detection: always use devColor
      return { id, icon: faToolbox as IconDefinition, color: devColor };
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
  enabledModesFromEnv.forEach(modeId => {
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
    if (!enabledModesFromEnv.includes(mode.id)) {
      orderedModes.push({
        ...mode,
        enabled: false
      });
    }
  });

  return orderedModes;
};

export const TRANSPORT_MODES: TransportMode[] = createOrderedTransportModes();

// Create a map for quick lookup
export const TRANSPORT_MODES_MAP: Record<string, TransportMode> = TRANSPORT_MODES.reduce((acc, mode) => {
  acc[mode.id] = mode;
  return acc;
}, {} as Record<string, TransportMode>);

// Get only enabled modes
export const ENABLED_TRANSPORT_MODES: TransportMode[] = TRANSPORT_MODES.filter(mode => mode.enabled);

// Get active modes (modes that should be pre-selected)
export const ACTIVE_TRANSPORT_MODES: string[] = activeModesFromEnv;

// Export colors map for backward compatibility
export const ROUTE_COLORS: Record<string, string> = TRANSPORT_MODES.reduce((acc, mode) => {
  acc[mode.id] = mode.color;
  return acc;
}, {} as Record<string, string>);

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
  return Array.isArray(unknownModes) && unknownModes.includes(modeId);
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

