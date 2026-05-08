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
import { RouterApiService } from '../services/routerApi';
import type { ApiRequest } from '../types/api';
import { RoutePoint, RouteResult, CartowayResponse, Dimension } from '../types/route';
import { ROUTE_COLORS } from '../config/transportModes';
import { useTranslation } from '../contexts/TranslationContext';

export const useRouteCalculation = () => {
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<Record<string, { motorway: boolean; toll: boolean; low_emission_zone: boolean; track: boolean }>>({});
  const { t } = useTranslation();

  // Use useRef to keep the service instance stable across renders
  const routerServiceRef = useRef<RouterApiService>();
  if (!routerServiceRef.current) {
    routerServiceRef.current = new RouterApiService();
  }
  const lastRouteCalcKeyRef = useRef<string>('');
  const isCalculatingRef = useRef<boolean>(false);

  // Set translator for the service
  React.useEffect(() => {
    if (routerServiceRef.current) {
      routerServiceRef.current.setTranslator(t);
    }
  }, [t]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!routerServiceRef.current) return;
        const caps = await routerServiceRef.current.getCapabilities();
        if (!cancelled) setCapabilities(caps);
      } catch {
        // ignore capability errors; UI will just not display support indicators
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const calculateRoutes = useCallback(async (
    origin: RoutePoint,
    destination: RoutePoint,
    modes: string[],
    onRequestLog?: (request: ApiRequest) => void,
    options?: Partial<{ motorway: boolean; toll: boolean; low_emission_zone: boolean; track: boolean; dimensions: Dimension[]; }>
  ) => {
    if (modes.length === 0 || !routerServiceRef.current) return;

    // Prevent multiple simultaneous calculations
    if (isCalculatingRef.current) {
      return;
    }

    const dimensions: Dimension[] = options?.dimensions && options.dimensions.length > 0
      ? options.dimensions
      : ['time'];

    // Build a stable key to avoid duplicate (and looping) recalculations
    const optsKey =
      options
        ? `${options.motorway ? 1 : 0}${options.toll ? 1 : 0}${options.low_emission_zone ? 1 : 0}${options.track ? 1 : 0}|${[...dimensions].sort().join(',')}`
        : '0000|time';
    const modesKey = [...modes].sort().join(',');
    const key = `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}->${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}|${modesKey}|${optsKey}`;
    if (lastRouteCalcKeyRef.current === key) {
      return;
    }

    // Set up request logging if callback provided
    if (onRequestLog) {
      routerServiceRef.current.setRequestLogger(onRequestLog);
    }

    isCalculatingRef.current = true;
    setIsCalculating(true);
    setError(null);

    // Build all (mode, dimension) combinations to calculate
    const combinations: Array<{ mode: string; dimension: Dimension }> = dimensions.flatMap(dim =>
      modes.map(mode => ({ mode, dimension: dim }))
    );

    try {
      // Calculate per (mode, dimension) to capture partial failures
      const settled = await Promise.allSettled(
        combinations.map(async ({ mode, dimension }) => {
          const res: CartowayResponse = await routerServiceRef.current!.calculateRoute(
            origin,
            destination,
            { mode, geometry: true, dimension, motorway: options?.motorway, toll: options?.toll, low_emission_zone: options?.low_emission_zone, track: options?.track }
          );
          return { mode, dimension, res };
        })
      );

      const nextResults: RouteResult[] = [];
      const successCount = { value: 0 };
      const failureCount = { value: 0 };

      settled.forEach((r, idx) => {
        const { mode, dimension } = combinations[idx];
        if (r.status === 'fulfilled') {
          const { res } = r.value;
          successCount.value++;
          if (res.features && res.features.length > 0) {
            const feature = res.features[0];
            const routeResult = routerServiceRef.current!.convertToRouteResult(feature, mode);
            nextResults.push({
              ...routeResult,
              dimension,
              color: ROUTE_COLORS[mode] || '#6B7280',
            });
          }
        } else {
          failureCount.value++;
          const message = r.reason instanceof Error ? r.reason.message : t('errors.calculationError');
          nextResults.push({
            mode,
            dimension,
            duration: 0,
            distance: 0,
            color: ROUTE_COLORS[mode] || '#6B7280',
            error: true,
            errorMessage: message,
          });
        }
      });

      // Merge with previous, replacing entries for the calculated (mode, dimension) pairs
      const modeSet = new Set(modes);
      const dimSet = new Set(dimensions);
      setRoutes(prevRoutes => {
        const filteredRoutes = prevRoutes.filter(
          route => !(modeSet.has(route.mode) && dimSet.has(route.dimension))
        );
        return [...filteredRoutes, ...nextResults];
      });

      if (nextResults.length === 0) {
        setError(t('errors.noRoutesFound'));
      } else if (failureCount.value > 0 && successCount.value === 0) {
        setError(t('errors.allRoutesFailed'));
      } else {
        setError(null);
      }
      lastRouteCalcKeyRef.current = key;
    } finally {
      // Always stop calculating when done
      isCalculatingRef.current = false;
      setIsCalculating(false);
    }
  }, [t]);

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
    capabilities,
  };
};
