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

import { RoutePoint, RouteOptions, CartowayResponse, CartowayFeature } from '../types/route';
import { ApiRequest } from '../types/api';
import polyline from '@mapbox/polyline';

const ROUTER_BASE_URL = import.meta.env.VITE_ROUTER_API_URL || 'https://router.cartoway.com';



interface HttpError extends Error {
  isHttpError: true;
}

export class RouterApiService {
  private apiKey: string;
  private onRequestLog?: (request: ApiRequest) => void;
  private translate?: (key: string) => string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_ROUTER_API_KEY || 'demo';
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

    // Format coordinates as: lat1,lng1,lat2,lng2
    const locs = `${origin.lat},${origin.lng},${destination.lat},${destination.lng}`;

    const params = new URLSearchParams({
      api_key: this.apiKey,
      mode: options.mode,
      locs: locs,
      geometry: options.geometry ? 'true' : 'false',
      precision: '6'
    });

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    const url = `${ROUTER_BASE_URL}/0.1/routes?${params}`;

    // Log request start
    const request: ApiRequest = {
      id: requestId,
      timestamp: new Date(),
      method: 'GET',
      url,
      requestData: {
        origin,
        destination,
        options,
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

  async calculateMultipleRoutes(
    origin: RoutePoint,
    destination: RoutePoint,
    modes: string[]
  ): Promise<CartowayResponse[]> {
    const promises = modes.map(mode =>
      this.calculateRoute(origin, destination, {
        mode,
        geometry: true,
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
}
