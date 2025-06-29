export interface RoutePoint {
  lat: number;
  lng: number;
  address?: string;
}

export interface RouteOptions {
  mode: string;
  optimize?: boolean;
  geometry?: boolean;
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
