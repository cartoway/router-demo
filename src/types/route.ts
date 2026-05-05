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

export interface RoutePoint {
  lat: number;
  lng: number;
  address?: string;
}

export interface RouteOptions {
  mode: string;
  optimize?: boolean;
  geometry?: boolean;
  dimension?: Dimension;
  motorway?: boolean;
  toll?: boolean;
  low_emission_zone?: boolean;
  track?: boolean;
}

export interface RouteResult {
  mode: string;
  duration: number;
  distance: number;
  geometry?: {
    coordinates: [number, number][];
    type: string;
  };
  color: string;
  // When present, indicates this entry represents a failed calculation for this mode
  error?: boolean;
  errorMessage?: string;
}

export type Dimension = 'time' | 'distance';

export interface IsolineResult {
  mode: string;
  dimension: Dimension;
  size: number;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    // GeoJSON polygon/multipolygon coordinates in [lng, lat]
    coordinates: number[][][] | number[][][][];
  };
  color: string;
}

export interface CartowayFeature {
  properties: {
    router: {
      total_distance: number;
      total_time: number;
      start_point: [number, number];
      end_point: [number, number];
    };
  };
  type: 'Feature';
  geometry: {
    polylines: string;
    type: 'LineString';
  };
}

export interface CartowayResponse {
  type: 'FeatureCollection';
  features: CartowayFeature[];
}
