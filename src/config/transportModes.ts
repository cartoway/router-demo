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
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface TransportMode {
  id: string;
  icon: IconDefinition;
  color: string;
}

export const TRANSPORT_MODES: TransportMode[] = [
  { id: 'car', icon: faCar, color: '#2563EB' },
  { id: 'cargo_bike', icon: faPersonBiking, color: '#059669' },
  { id: 'scooter', icon: faMotorcycle, color: '#8B5CF6' },
  { id: 'van', icon: faVanShuttle, color: '#FCC419' },
  { id: 'truck_19', icon: faTruck, color: '#DC2626' },
];

// Create a map for quick lookup
export const TRANSPORT_MODES_MAP: Record<string, TransportMode> = TRANSPORT_MODES.reduce((acc, mode) => {
  acc[mode.id] = mode;
  return acc;
}, {} as Record<string, TransportMode>);

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
