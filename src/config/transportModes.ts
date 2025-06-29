import {
  faCar,
  faBicycle,
  faPersonWalking,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface TransportMode {
  id: string;
  label: string;
  icon: IconDefinition;
  color: string;
}

export const TRANSPORT_MODES: TransportMode[] = [
  { id: 'car', label: 'Voiture', icon: faCar, color: '#2563EB' },
  { id: 'bicycle', label: 'Vélo', icon: faBicycle, color: '#059669' },
  { id: 'scooter', label: 'Scooter', icon: faPersonWalking, color: '#DC2626' },
  { id: 'truck_19', label: 'Camion <19t', icon: faTruck, color: '#8B5CF6' }
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
export const getModeLabel = (modeId: string): string => {
  return TRANSPORT_MODES_MAP[modeId]?.label || modeId;
};

export const getModeColor = (modeId: string): string => {
  return TRANSPORT_MODES_MAP[modeId]?.color || '#6B7280';
};

export const getModeIcon = (modeId: string) => {
  return TRANSPORT_MODES_MAP[modeId]?.icon;
};
