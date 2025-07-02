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

import React, { useState, useCallback, useRef } from 'react';
import { RouterApiService, ApiRequest } from '../services/routerApi';
import { RoutePoint, RouteResult, CartowayResponse } from '../types/route';
import { ROUTE_COLORS } from '../config/transportModes';
import { useTranslation } from '../contexts/TranslationContext';

export const useRouteCalculation = () => {
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  // Use useRef to keep the service instance stable across renders
  const routerServiceRef = useRef<RouterApiService>();
  if (!routerServiceRef.current) {
    routerServiceRef.current = new RouterApiService();
  }

  // Set translator for the service
  React.useEffect(() => {
    if (routerServiceRef.current) {
      routerServiceRef.current.setTranslator(t);
    }
  }, [t]);

  const calculateRoutes = useCallback(async (
    origin: RoutePoint,
    destination: RoutePoint,
    modes: string[],
    onRequestLog?: (request: ApiRequest) => void
  ) => {
    if (modes.length === 0 || !routerServiceRef.current) return;

    // Prevent multiple simultaneous calculations
    if (isCalculating) {
      return;
    }

    // Set up request logging if callback provided
    if (onRequestLog) {
      routerServiceRef.current.setRequestLogger(onRequestLog);
    }

    setIsCalculating(true);
    setError(null);

    try {
      const results = await routerServiceRef.current.calculateMultipleRoutes(origin, destination, modes);

      const routeResults: RouteResult[] = [];

      results.forEach((result: CartowayResponse, index: number) => {
        const mode = modes[index];

        // Check if the response has features
        if (result.features && result.features.length > 0) {
          const feature = result.features[0]; // Take the first feature

          // Convert RouterApi feature to RouteResult format
          const routeResult = routerServiceRef.current!.convertToRouteResult(feature, mode);

          routeResults.push({
            ...routeResult,
            color: ROUTE_COLORS[mode] || '#6B7280',
          });
        }
      });

      // Add new routes to existing ones instead of replacing
      setRoutes(prevRoutes => {
        // Remove any existing routes for the modes being calculated
        const filteredRoutes = prevRoutes.filter(route => !modes.includes(route.mode));
        // Add new routes
        return [...filteredRoutes, ...routeResults];
      });

      if (routeResults.length === 0) {
        setError(t('errors.noRoutesFound'));
      }
    } catch (err) {
      // Use the specific error message from the API if available
      const errorMessage = err instanceof Error ? err.message : t('errors.calculationError');
      setError(errorMessage);
      setRoutes([]);
    } finally {
      // Always stop calculating when done
      setIsCalculating(false);
    }
  }, []);

  const clearRoutes = useCallback(() => {
    setRoutes([]);
    setError(null);
  }, []);

  return {
    routes,
    isCalculating,
    error,
    calculateRoutes,
    clearRoutes,
  };
};
