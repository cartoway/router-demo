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

import { useState, useCallback, useRef } from 'react';
import { RouterApiService } from '../services/routerApi';
import { RoutePoint, RouteResult } from '../types/route';
import { ROUTE_COLORS } from '../config/transportModes';

export const useRouteCalculation = () => {
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const calculationStartTime = useRef<number | null>(null);
  const minCalculationTime = 800; // Minimum 800ms to show loading state

  const routerService = new RouterApiService();

  const calculateRoutes = useCallback(async (
    origin: RoutePoint,
    destination: RoutePoint,
    modes: string[]
  ) => {
    if (modes.length === 0) return;

    calculationStartTime.current = Date.now();
    setIsCalculating(true);
    setError(null);

    try {
      const results = await routerService.calculateMultipleRoutes(origin, destination, modes);

      const routeResults: RouteResult[] = [];

      results.forEach((result, index) => {
        const mode = modes[index];

        // Check if the response has features
        if (result.features && result.features.length > 0) {
          const feature = result.features[0]; // Take the first feature

          // Convert RouterApi feature to RouteResult format
          const routeResult = routerService.convertToRouteResult(feature, mode);

          routeResults.push({
            ...routeResult,
            color: ROUTE_COLORS[mode] || '#6B7280',
          });
        }
      });

      setRoutes(routeResults);

      if (routeResults.length === 0) {
        setError('Aucun itinéraire trouvé pour les modes sélectionnés');
      }
    } catch (err) {
      console.error('Error calculating routes:', err);
      setError('Erreur lors du calcul des itinéraires. Vérifiez votre connexion.');

      // Fallback: Generate mock routes for demonstration
      const mockRoutes: RouteResult[] = modes.map(mode => ({
        mode,
        duration: Math.floor(Math.random() * 3600) + 600, // 10min to 1h
        distance: Math.floor(Math.random() * 50000) + 1000, // 1km to 50km
        color: ROUTE_COLORS[mode] || '#6B7280',
        geometry: {
          type: 'LineString',
          coordinates: [
            [origin.lng, origin.lat],
            [
              origin.lng + (destination.lng - origin.lng) * 0.3 + (Math.random() - 0.5) * 0.01,
              origin.lat + (destination.lat - origin.lat) * 0.3 + (Math.random() - 0.5) * 0.01
            ],
            [
              origin.lng + (destination.lng - origin.lng) * 0.7 + (Math.random() - 0.5) * 0.01,
              origin.lat + (destination.lat - origin.lat) * 0.7 + (Math.random() - 0.5) * 0.01
            ],
            [destination.lng, destination.lat],
          ],
        },
      }));

      setRoutes(mockRoutes);
    } finally {
      // Ensure minimum display time for smooth UX
      const elapsedTime = Date.now() - (calculationStartTime.current || 0);
      const remainingTime = Math.max(0, minCalculationTime - elapsedTime);

      setTimeout(() => {
        setIsCalculating(false);
      }, remainingTime);
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
