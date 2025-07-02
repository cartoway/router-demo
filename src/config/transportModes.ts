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
  faCar,
  faPersonBiking,
  faMotorcycle,
  faTruck,
  faVanShuttle,
  faPersonWalking,
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface TransportMode {
  id: string;
  icon: IconDefinition;
  color: string;
  enabled: boolean;
}

// Get enabled modes from environment variable
const getEnabledModesFromEnv = (): string[] => {
  const envModes = import.meta.env.VITE_ENABLED_TRANSPORT_MODES;

  if (!envModes) {
    // Default enabled modes if no environment variable is set
    return ['car', 'cargo_bike', 'scooter', 'van', 'truck_19'];
  }

  const enabledModes = envModes.split(',').map((mode: string) => mode.trim()).filter((mode: string) => mode.length > 0);
  return enabledModes;
};

// Get active modes from environment variable (modes to be pre-selected)
const getActiveModesFromEnv = (): string[] => {
  const envModes = import.meta.env.VITE_ACTIVE_TRANSPORT_MODES;

  if (!envModes) {
    // Default active modes if no environment variable is set
    return ['car', 'cargo_bike'];
  }

  const activeModes = envModes.split(',').map((mode: string) => mode.trim()).filter((mode: string) => mode.length > 0);
  return activeModes;
};

const enabledModesFromEnv = getEnabledModesFromEnv();
const activeModesFromEnv = getActiveModesFromEnv();

// Create transport modes array respecting the order from VITE_ENABLED_TRANSPORT_MODES
const createOrderedTransportModes = (): TransportMode[] => {
  const allModes = [
    { id: 'car', icon: faCar, color: '#2563EB' },
    { id: 'cargo_bike', icon: faPersonBiking, color: '#059669' },
    { id: 'scooter', icon: faMotorcycle, color: '#8B5CF6' },
    { id: 'van', icon: faVanShuttle, color: '#FCC419' },
    { id: 'truck_19', icon: faTruck, color: '#DC2626' },
    { id: 'truck_75', icon: faTruck, color: '#7C2D12' },
    { id: 'truck_12', icon: faTruck, color: '#991B1B' },
    { id: 'truck_26', icon: faTruck, color: '#B91C1C' },
    { id: 'truck_32', icon: faTruck, color: '#DC2626' },
    { id: 'truck_44', icon: faTruck, color: '#EF4444' },
    { id: 'bicycle', icon: faPersonBiking, color: '#16A34A' },
    { id: 'foot', icon: faPersonWalking, color: '#6B7280' },
  ];

  // Create a map for quick lookup
  const modesMap = allModes.reduce((acc, mode) => {
    acc[mode.id] = mode;
    return acc;
  }, {} as Record<string, typeof allModes[0]>);

  // Build ordered array based on VITE_ENABLED_TRANSPORT_MODES
  const orderedModes: TransportMode[] = [];

  // First, add modes in the order specified by VITE_ENABLED_TRANSPORT_MODES
  enabledModesFromEnv.forEach(modeId => {
    const mode = modesMap[modeId];
    if (mode) {
      orderedModes.push({
        ...mode,
        enabled: true
      });
    }
  });

  // Then, add any remaining modes that weren't in VITE_ENABLED_TRANSPORT_MODES (disabled)
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

