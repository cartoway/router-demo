/*
 * Hook to calculate isolines (isochrones/isodistances)
 */
import { useRef, useState, useCallback } from 'react';
import { RouterApiService } from '../services/routerApi';
import type { ApiRequest } from '../types/api';
import { IsolineResult, IsolineDimension, RoutePoint } from '../types/route';
import { ROUTE_COLORS } from '../config/transportModes';

export const useIsolineCalculation = () => {
  const [isolines, setIsolines] = useState<IsolineResult[]>([]);
  const [isCalculatingIsoline, setIsCalculatingIsoline] = useState(false);
  const [isolineError, setIsolineError] = useState<string | null>(null);
  const routerServiceRef = useRef<RouterApiService>();
  const lastCalcKeyRef = useRef<string>('');
  if (!routerServiceRef.current) {
    routerServiceRef.current = new RouterApiService();
  }

  const clearIsolines = useCallback(() => {
    setIsolines([]);
    setIsolineError(null);
  }, []);

  const setRequestLogger = useCallback((cb: (request: ApiRequest) => void) => {
    if (routerServiceRef.current) {
      routerServiceRef.current.setRequestLogger(cb);
    }
  }, []);

  const calculateIsolines = useCallback(async (loc: RoutePoint, modes: string[], dimension: IsolineDimension, size: number, commonOptions?: { motorway?: boolean; toll?: boolean; low_emission_zone?: boolean; track?: boolean }) => {
    if (modes.length === 0 || !routerServiceRef.current) return;
    if (isCalculatingIsoline) return;
    const optsKey = commonOptions ? `${commonOptions.motorway ? 1 : 0}${commonOptions.toll ? 1 : 0}${commonOptions.low_emission_zone ? 1 : 0}${commonOptions.track ? 1 : 0}` : '0000';
    const key = `${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}|${dimension}:${size}|${[...modes].sort().join(',')}|${optsKey}`;
    if (lastCalcKeyRef.current === key) return;
    setIsolineError(null);
    setIsCalculatingIsoline(true);
    try {
      const promises = modes.map(async (mode) => {
        const res = await routerServiceRef.current!.calculateIsoline(loc, { mode, dimension, size, ...commonOptions });
        res.color = ROUTE_COLORS[mode] || '#3B82F6';
        return res;
      });
      const settled = await Promise.allSettled(promises);
      const successful = settled
        .filter((r): r is PromiseFulfilledResult<IsolineResult> => r.status === 'fulfilled')
        .map(r => r.value);
      setIsolines(successful);
      const rejected = settled.filter(r => r.status === 'rejected');
      if (rejected.length > 0 && successful.length > 0) {
        setIsolineError('Some isolines failed to calculate');
      } else if (rejected.length > 0) {
        setIsolineError('Isoline calculation failed');
      } else {
        setIsolineError(null);
      }
      lastCalcKeyRef.current = key;
    } catch (e) {
      setIsolineError(e instanceof Error ? e.message : 'Unknown isoline error');
      // keep previous isolines if partial failure
    } finally {
      setIsCalculatingIsoline(false);
    }
  }, [isCalculatingIsoline]);

  // Calculate a set of heterogeneous isolines (different mode/dimension/size)
  const calculateIsolineItems = useCallback(async (loc: RoutePoint, items: Array<{ mode: string; dimension: IsolineDimension; size: number }>, commonOptions?: { motorway?: boolean; toll?: boolean; low_emission_zone?: boolean; track?: boolean }) => {
    if (!routerServiceRef.current) return;
    if (items.length === 0) { setIsolines([]); return; }
    // Build a stable cache key to avoid duplicate recalculations at same origin with same items
    const itemsKey = [...items]
      .map(i => `${i.mode}:${i.dimension}:${i.size}`)
      .sort()
      .join(',');
    const optsKey = commonOptions ? `${commonOptions.motorway ? 1 : 0}${commonOptions.toll ? 1 : 0}${commonOptions.low_emission_zone ? 1 : 0}${commonOptions.track ? 1 : 0}` : '0000';
    const key = `${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}|${itemsKey}|${optsKey}`;
    if (lastCalcKeyRef.current === key) return;
    setIsolineError(null);
    setIsCalculatingIsoline(true);
    try {
      const settled = await Promise.allSettled(items.map(async (item) => {
        const res = await routerServiceRef.current!.calculateIsoline(loc, { mode: item.mode, dimension: item.dimension, size: item.size, ...commonOptions });
        res.color = ROUTE_COLORS[item.mode] || '#3B82F6';
        return res;
      }));
      const successful = settled
        .filter((r): r is PromiseFulfilledResult<IsolineResult> => r.status === 'fulfilled')
        .map(r => r.value);
      setIsolines(successful);
      const rejected = settled.filter(r => r.status === 'rejected');
      if (rejected.length > 0 && successful.length > 0) {
        setIsolineError('Some isolines failed to calculate');
      } else if (rejected.length > 0) {
        setIsolineError('Isoline calculation failed');
      } else {
        setIsolineError(null);
      }
      lastCalcKeyRef.current = key;
    } catch (e) {
      setIsolineError(e instanceof Error ? e.message : 'Unknown isoline error');
      // keep previous isolines if partial failure
    } finally {
      setIsCalculatingIsoline(false);
    }
  }, []);

  const removeIsoline = useCallback((mode: string, dimension: IsolineDimension, size: number) => {
    setIsolines(prev => prev.filter(iso => !(iso.mode === mode && iso.dimension === dimension && iso.size === size)));
  }, []);

  // Calculate only one item (used on add) without recalculating existing ones
  const calculateIsolineForItem = useCallback(async (loc: RoutePoint, item: { mode: string; dimension: IsolineDimension; size: number }, commonOptions?: { motorway?: boolean; toll?: boolean; low_emission_zone?: boolean; track?: boolean }) => {
    if (!routerServiceRef.current) return;
    const optsKey = commonOptions ? `${commonOptions.motorway ? 1 : 0}${commonOptions.toll ? 1 : 0}${commonOptions.low_emission_zone ? 1 : 0}${commonOptions.track ? 1 : 0}` : '0000';
    const key = `${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}|${item.mode}:${item.dimension}:${item.size}|${optsKey}`;
    if (lastCalcKeyRef.current === key) return;
    setIsolineError(null);
    setIsCalculatingIsoline(true);
    try {
      const res = await routerServiceRef.current!.calculateIsoline(loc, { mode: item.mode, dimension: item.dimension, size: item.size, ...commonOptions });
      res.color = ROUTE_COLORS[item.mode] || '#3B82F6';
      setIsolines(prev => {
        const filtered = prev.filter(iso => !(iso.mode === item.mode && iso.dimension === item.dimension && iso.size === item.size));
        return [...filtered, res];
      });
      lastCalcKeyRef.current = key;
    } catch (e) {
      setIsolineError(e instanceof Error ? e.message : 'Unknown isoline error');
      // Avoid re-triggering the same failed request in a loop
      lastCalcKeyRef.current = key;
    } finally {
      setIsCalculatingIsoline(false);
    }
  }, []);

  return {
    isolines,
    isCalculatingIsoline,
    isolineError,
    calculateIsolines,
    calculateIsolineItems,
    calculateIsolineForItem,
    clearIsolines,
    setRequestLogger,
    removeIsoline,
  };
};


