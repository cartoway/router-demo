import { useState, useCallback } from 'react';
import { RoutePoint, RouteResult } from '../types/route';
import { CartowayApiService } from '../services/cartowayApi';
import { ROUTE_COLORS } from '../config/transportModes';

export const useRouteCalculation = () => {
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cartowayService = new CartowayApiService();

  const calculateRoutes = useCallback(async (
    origin: RoutePoint,
    destination: RoutePoint,
    modes: string[]
  ) => {
    if (modes.length === 0) return;

    setIsCalculating(true);
    setError(null);

    try {
      const results = await cartowayService.calculateMultipleRoutes(origin, destination, modes);

      const routeResults: RouteResult[] = [];

      results.forEach((result, index) => {
        const mode = modes[index];

        // Check if the response has features
        if (result.features && result.features.length > 0) {
          const feature = result.features[0]; // Take the first feature

          // Convert Cartoway feature to RouteResult format
          const routeResult = cartowayService.convertToRouteResult(feature, mode);

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
