import { useEffect, useState, useRef } from 'react';
import { MapIsolines } from '../components/MapIsolines';
import { ENABLED_TRANSPORT_MODES, ACTIVE_TRANSPORT_MODES, getModeLabel, getModeColor, getModeIcon } from '../config/transportModes';
import { RouterApiService } from '../services/routerApi';
import { useIsolineCalculation } from '../hooks/useIsolineCalculation';
import ApiRequestsPanel from '../components/ApiRequestsPanel';
import type { ApiRequest } from '../types/api';
import { RoutePoint } from '../types/route';
import { useTranslation } from '../contexts/TranslationContext';
import { getIsolineMaxProfiles } from '../config/env';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot, faTrash, faPlus, faChevronDown } from '@fortawesome/free-solid-svg-icons';

type IsolineItem = {
  id: string;
  mode: string;
  dimension: 'time' | 'distance';
  size: number;
  options?: { motorway: boolean; toll: boolean; low_emission_zone: boolean; track: boolean };
};
interface IsolinesPageProps { isDevMode?: boolean }

export default function IsolinesPage({ isDevMode: isDevModeProp }: IsolinesPageProps) {
  const { t } = useTranslation();
  const [origin, setOrigin] = useState<RoutePoint | null>(null);
  const [items, setItems] = useState<IsolineItem[]>([]);
  const [selectedMode, setSelectedMode] = useState<string>(() => (ACTIVE_TRANSPORT_MODES[0] || ENABLED_TRANSPORT_MODES[0]?.id || 'car'));
  const { isolines, calculateIsolineItems, calculateIsolineForItem, setRequestLogger, removeIsoline, isCalculatingIsoline } = useIsolineCalculation();
  const [apiRequests, setApiRequests] = useState<ApiRequest[]>([]);
  const [newDimension, setNewDimension] = useState<'time' | 'distance'>('time');
  const [newSizeInput, setNewSizeInput] = useState<string>('00:10:00'); // default 10 minutes for time
  const [lastCalcAt, setLastCalcAt] = useState<number>(0);
  const [availableDimsByMode, setAvailableDimsByMode] = useState<Record<string, Array<'time' | 'distance'>>>(() => ({}));
  const [optionsOpen, setOptionsOpen] = useState<boolean>(false);
  const [routeCapabilities, setRouteCapabilities] = useState<Record<string, { motorway: boolean; toll: boolean; low_emission_zone: boolean; track: boolean }>>({});
  const [isolineOptions, setIsolineOptions] = useState<{ motorway: boolean; toll: boolean; low_emission_zone: boolean; track: boolean }>({
    motorway: false,
    toll: false,
    low_emission_zone: false,
    track: false,
  });
  const MAX_PROFILES = getIsolineMaxProfiles();
  const isDevMode = typeof isDevModeProp === 'boolean'
    ? isDevModeProp
    : (() => {
        try {
          const params = new URLSearchParams(window.location.search);
          const debugParam = params.get('debug');
          return debugParam === '1' || (debugParam || '').toLowerCase() === 'true';
        } catch {
          return false;
        }
      })();
  const mapColSpan = isDevMode ? 'lg:col-span-6' : 'lg:col-span-9';

  // Helpers to sync profiles to/from URL
  // Encode each item as "mode:dimension:size:opts" where opts is 4-bit string (motorway,toll,lez,track)
  const formatProfilesParamFromItems = (itemsToEncode: IsolineItem[]): string => {
    return itemsToEncode
      .map(({ mode, dimension, size, options }) => {
        const o = options || { motorway: false, toll: false, low_emission_zone: false, track: false };
        const bits = `${o.motorway ? 1 : 0}${o.toll ? 1 : 0}${o.low_emission_zone ? 1 : 0}${o.track ? 1 : 0}`;
        return `${mode}:${dimension}:${Math.round(size)}:${bits}`;
      })
      .join(';');
  };
  const parseProfilesParam = (value: string | null): Array<{ mode: string; dimension: 'time' | 'distance'; size: number; options: { motorway: boolean; toll: boolean; low_emission_zone: boolean; track: boolean } }> => {
    if (!value) return [];
    const normalized = value.replace(/%3B/ig, ';').replace(/%2C/ig, ';').replace(/,/g, ';');
    const parts = normalized.split(';').map(s => s.trim()).filter(Boolean);
    const parsed: Array<{ mode: string; dimension: 'time' | 'distance'; size: number; options: { motorway: boolean; toll: boolean; low_emission_zone: boolean; track: boolean } }> = [];
    parts.forEach(token => {
      const [mode, dimension, sizeStr, optsStr] = token.split(':');
      if (!mode || !dimension || !sizeStr) return;
      const dim = (dimension === 'time' || dimension === 'distance') ? dimension : null;
      if (!dim) return;
      const sizeNum = Number(sizeStr);
      if (!Number.isFinite(sizeNum) || sizeNum <= 0) return;
      const optsBits = (optsStr && /^[01]{4}$/.test(optsStr)) ? optsStr : '0000';
      const options = {
        motorway: optsBits[0] === '1',
        toll: optsBits[1] === '1',
        low_emission_zone: optsBits[2] === '1',
        track: optsBits[3] === '1',
      };
      parsed.push({ mode, dimension: dim, size: Math.round(sizeNum), options });
    });
    return parsed;
  };
  const parseLatLng = (value: string | null): RoutePoint | null => {
    if (!value) return null;
    const parts = value.split(/[:_,]/);
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
    return { lat, lng };
  };

  // Initial read of profiles from URL
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const srcStr = params.get('src');
      const initialOrigin = parseLatLng(srcStr);
      if (initialOrigin) {
        setOrigin(initialOrigin);
      }
      // Read isoline options if present (accept both 'lez' and 'low_emission_zone')
      const parseBool = (v: string | null): boolean | null => {
        if (v == null) return null;
        const s = v.toLowerCase();
        if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true;
        if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false;
        return null;
      };
      const motorwayParam = params.get('motorway');
      const tollParam = params.get('toll');
      const lezParam = params.get('lez') ?? params.get('low_emission_zone');
      const trackParam = params.get('track');
      const motorwayVal = parseBool(motorwayParam);
      const tollVal = parseBool(tollParam);
      const lezVal = parseBool(lezParam);
      const trackVal = parseBool(trackParam);
      setIsolineOptions(prev => ({
        motorway: motorwayVal ?? prev.motorway,
        toll: tollVal ?? prev.toll,
        low_emission_zone: lezVal ?? prev.low_emission_zone,
        track: trackVal ?? prev.track,
      }));
      const profilesParam = params.get('profiles');
      const parsed = parseProfilesParam(profilesParam);
      if (parsed.length > 0) {
        const unique = parsed.filter((p, idx, arr) =>
          arr.findIndex(q =>
            q.mode === p.mode &&
            q.dimension === p.dimension &&
            q.size === p.size &&
            q.options.motorway === p.options.motorway &&
            q.options.toll === p.options.toll &&
            q.options.low_emission_zone === p.options.low_emission_zone &&
            q.options.track === p.options.track
          ) === idx
        );
        setItems(unique.map((p, idx) => ({
          id: `url_${idx}_${p.mode}_${p.dimension}_${p.size}`,
          mode: p.mode,
          dimension: p.dimension,
          size: p.size,
          options: p.options
        })));
      }
    } catch {
      // ignore malformed URL
    }
  }, []);

  // Keep profiles in URL in sync with items
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      // Sync origin under 'src'
      if (origin) {
        params.set('src', `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}`);
      } else {
        params.delete('src');
      }
      if (items.length > 0) {
        const val = formatProfilesParamFromItems(items);
        params.set('profiles', val);
      } else {
        params.delete('profiles');
      }
      // Sync routing-like options for isolines
      if (isolineOptions.motorway) { params.set('motorway', '1'); } else { params.delete('motorway'); }
      if (isolineOptions.toll) { params.set('toll', '1'); } else { params.delete('toll'); }
      if (isolineOptions.low_emission_zone) { params.set('lez', '1'); } else { params.delete('lez'); }
      if (isolineOptions.track) { params.set('track', '1'); } else { params.delete('track'); }
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, '', newUrl);
    } catch {
      // ignore
    }
  }, [items, origin, isolineOptions]);

  // Fetch capabilities for isolines once (available dimensions per mode)
  useEffect(() => {
    let cancelled = false;
    const svc = new RouterApiService();
    svc.getIsolineCapabilities().then((caps) => {
      if (cancelled) return;
      setAvailableDimsByMode(caps);
    }).catch(() => {
      // keep defaults on failure
    });
    return () => { cancelled = true; };
  }, []);

  // Adjust selected mode/dimension when capabilities or selection change
  useEffect(() => {
    const caps = availableDimsByMode;
    if (!caps || Object.keys(caps).length === 0) return;
    const dims = caps[selectedMode];
    if (!dims || dims.length === 0) {
      const first = ENABLED_TRANSPORT_MODES.find(({ id }) => Array.isArray(caps[id]) && caps[id].length > 0)?.id;
      if (first) {
        setSelectedMode(first);
        const firstDims = caps[first]!;
        const nextDim: 'time' | 'distance' = firstDims.includes('time') ? 'time' : firstDims[0];
        setNewDimension(nextDim);
        setNewSizeInput(nextDim === 'time' ? '00:10:00' : '10000');
      }
    } else if (!dims.includes(newDimension)) {
      const nextDim: 'time' | 'distance' = dims.includes('time') ? 'time' : dims[0];
      setNewDimension(nextDim);
      setNewSizeInput(nextDim === 'time' ? '00:10:00' : '10000');
    }
  }, [availableDimsByMode, selectedMode, newDimension]);

  // Fetch route capabilities to know which options are supported by selected mode
  useEffect(() => {
    let cancelled = false;
    const svc = new RouterApiService();
    svc.getCapabilities().then((caps) => {
      if (cancelled) return;
      setRouteCapabilities(caps);
    }).catch(() => {
      // keep empty on failure
    });
    return () => { cancelled = true; };
  }, []);

  const handlePointSelect = (point: RoutePoint | null, type: 'origin') => {
    if (type === 'origin') {
      setOrigin(point);
      if (point && items.length > 0) {
        const plain = items.map(({ mode, dimension, size }) => ({ mode, dimension, size }));
        calculateIsolineItems(point, plain, isolineOptions);
        setLastCalcAt(Date.now());
      }
    }
  };

  // Parse size input according to dimension: seconds for time (hh:mm:ss or seconds), meters for distance
  const parseSize = (value: string, dimension: 'time' | 'distance'): number | null => {
    const trimmed = value.trim();
    if (dimension === 'distance') {
      const num = Number(trimmed);
      return Number.isFinite(num) && num > 0 ? num : null;
    }
    // time: allow hh:mm:ss or mm:ss or seconds
    if (/^\d{1,2}:\d{1,2}(:\d{1,2})?$/.test(trimmed)) {
      const parts = trimmed.split(':').map(n => Number(n));
      if (parts.some(n => Number.isNaN(n))) return null;
      let sec = 0;
      if (parts.length === 3) { sec = parts[0] * 3600 + parts[1] * 60 + parts[2]; }
      else { sec = parts[0] * 60 + parts[1]; }
      return sec > 0 ? sec : null;
    }
    const sec = Number(trimmed);
    return Number.isFinite(sec) && sec > 0 ? sec : null;
  };

  const addItem = () => {
    if (items.length >= MAX_PROFILES) return;
    const sizeVal = parseSize(newSizeInput, newDimension);
    if (!sizeVal) return;
    const id = `iso_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setItems(prev => {
      if (prev.length >= MAX_PROFILES) return prev;
      // Prevent duplicates (same mode/dimension/size)
      if (prev.some(i =>
        i.mode === selectedMode &&
        i.dimension === newDimension &&
        i.size === sizeVal &&
        (i.options?.motorway ?? false) === isolineOptions.motorway &&
        (i.options?.toll ?? false) === isolineOptions.toll &&
        (i.options?.low_emission_zone ?? false) === isolineOptions.low_emission_zone &&
        (i.options?.track ?? false) === isolineOptions.track
      )) {
        return prev;
      }
      const next = [...prev, {
        id,
        mode: selectedMode,
        dimension: newDimension,
        size: sizeVal,
        options: {
          motorway: isolineOptions.motorway,
          toll: isolineOptions.toll,
          low_emission_zone: isolineOptions.low_emission_zone,
          track: isolineOptions.track,
        }
      }];
      if (origin) {
        // calculate only the newly added profile
        calculateIsolineForItem(origin, { mode: selectedMode, dimension: newDimension, size: sizeVal }, isolineOptions);
        setLastCalcAt(Date.now());
      }
      return next;
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const found = prev.find(i => i.id === id);
      const next = prev.filter(i => i.id !== id);
      if (found) {
        removeIsoline(found.mode, found.dimension, found.size);
      }
      return next;
    });
  };

  // Keep latest items/options in refs to avoid re-running effect on their change
  const itemsRef = useRef(items);
  const isoOptsRef = useRef(isolineOptions);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { isoOptsRef.current = isolineOptions; }, [isolineOptions]);

  // Recalculate only when origin changes; add/remove/options handled explicitly elsewhere
  useEffect(() => {
    if (!origin || itemsRef.current.length === 0) return;
    const plain = itemsRef.current.map(({ mode, dimension, size }) => ({ mode, dimension, size }));
    calculateIsolineItems(origin, plain, isoOptsRef.current);
    setLastCalcAt(Date.now());
  }, [origin, calculateIsolineItems]);

  // Setup API request logging for the panel
  useEffect(() => {
    const handleApiRequest = (request: ApiRequest) => {
      setApiRequests(prev => {
        // Build a deduplication key independent of origin for isoline calls
        const buildIsoKey = (url: string): string | null => {
          try {
            const u = new URL(url);
            if (!u.pathname.includes('/isoline')) return null;
            const p = u.searchParams;
            const mode = p.get('mode') || '';
            const dim = p.get('dimension') || '';
            const sizeRaw = p.get('size') || '';
            // Normalize size: round numeric strings like "10000.0" -> "10000"
            const sizeNum = Number(sizeRaw);
            const sizeStr = Number.isFinite(sizeNum) ? String(Math.round(sizeNum)) : sizeRaw;
            // Include options in the key: motorway/toll/low_emission_zone/track
            const toBit = (v: string | null) => {
              if (!v) return '0';
              const s = v.toLowerCase();
              return (s === '1' || s === 'true') ? '1' : '0';
            };
            const bits =
              toBit(p.get('motorway')) +
              toBit(p.get('toll')) +
              toBit(p.get('low_emission_zone')) +
              toBit(p.get('track'));
            if (!mode || !dim || !sizeStr) return null;
            return `isoline|${mode}|${dim}|${sizeStr}|${bits}`;
          } catch {
            // Fallback parser
            const qIdx = url.indexOf('?');
            if (qIdx === -1) return null;
            const qs = url.slice(qIdx + 1);
            const params = new URLSearchParams(qs);
            const mode = params.get('mode') || '';
            const dim = params.get('dimension') || '';
            const sizeRaw = params.get('size') || '';
            const sizeNum = Number(sizeRaw);
            const sizeStr = Number.isFinite(sizeNum) ? String(Math.round(sizeNum)) : sizeRaw;
            const toBit = (v: string | null) => {
              if (!v) return '0';
              const s = v.toLowerCase();
              return (s === '1' || s === 'true') ? '1' : '0';
            };
            const bits =
              toBit(params.get('motorway')) +
              toBit(params.get('toll')) +
              toBit(params.get('low_emission_zone')) +
              toBit(params.get('track'));
            if (!mode || !dim || !sizeStr) return null;
            return `isoline|${mode}|${dim}|${sizeStr}|${bits}`;
          }
        };
        const isoKey = buildIsoKey(request.url);
        if (isoKey) {
          const filtered = prev.filter(r => buildIsoKey(r.url) !== isoKey);
          return [...filtered, request];
        }
        // Non-isoline: fallback to method+url
        const key = `${(request.method || 'GET').toUpperCase()} ${request.url}`;
        const filtered = prev.filter(r => `${(r.method || 'GET').toUpperCase()} ${r.url}` !== key);
        return [...filtered, request];
      });
    };
    setRequestLogger(handleApiRequest);
  }, [setRequestLogger]);

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(1, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(1, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-full mx-auto px-0 lg:px-8 py-0 lg:py-6 pb-20 lg:pb-0">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-4">
        <div className="lg:col-span-3 space-y-6 order-2 lg:order-1 p-4 lg:p-0">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 space-y-3 sm:space-y-3">
            <div className="flex items-center space-x-2">
              <FontAwesomeIcon icon={faLocationDot} className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">{t('routeControls.isolines.title')}</h2>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-700 mb-2">{t('map.instructions.selectOrigin')}</div>
                <div className="text-xs text-gray-500">
                  {origin ? `${origin.lat.toFixed(6)}, ${origin.lng.toFixed(6)}` : t('routeControls.isolines.needOrigin')}
                </div>
              </div>
            </div>

            {/* Add isoline form */}
            <div className="border rounded-lg bg-white p-3 space-y-2">
              {/* Transport mode selection - single selection, same UI as router */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2 sm:mb-3">{t('routeControls.transportModes.title')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {ENABLED_TRANSPORT_MODES.filter(({ id }) => (availableDimsByMode[id] || []).length > 0).map(({ id, icon: Icon, color }) => {
                    const isActive = selectedMode === id;
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          setSelectedMode(id);
                          const dims = availableDimsByMode[id] || ['time'];
                          const nextDim: 'time' | 'distance' = dims.includes('time') ? 'time' : dims[0];
                          setNewDimension(nextDim);
                          setNewSizeInput(nextDim === 'time' ? '00:10:00' : '10000');
                        }}
                        className={`flex items-center space-x-1 sm:space-x-2 p-2 sm:p-3 rounded-lg border-2 transition-all duration-200 ${
                          isActive ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <FontAwesomeIcon icon={Icon} className="h-3 w-3 sm:h-4 sm:w-4" style={{ color: isActive ? color : undefined }} />
                        <span className="text-xs sm:text-sm font-medium">{getModeLabel(id, t)}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Options accordion inside Transport Modes container */}
                <div className="mt-3 border rounded-lg bg-white">
                  <button
                    type="button"
                    onClick={() => setOptionsOpen(!optionsOpen)}
                    aria-expanded={optionsOpen}
                    className="w-full flex items-center justify-between px-3 py-2"
                  >
                    <span className="text-sm font-medium text-gray-700">{t('routeControls.options.title')}</span>
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className={`h-4 w-4 text-gray-500 transition-transform ${optionsOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div className={`transition-all duration-300 overflow-hidden ${optionsOpen ? 'max-h-[1200px] px-3 pb-3' : 'max-h-0 px-3'}`}>
                    {(() => {
                      const allKeys = [
                        { key: 'motorway' as const, label: t('routeControls.options.motorway') },
                        { key: 'toll' as const, label: t('routeControls.options.toll') },
                        { key: 'low_emission_zone' as const, label: t('routeControls.options.low_emission_zone') },
                        { key: 'track' as const, label: t('routeControls.options.track') },
                      ];
                      const caps = routeCapabilities[selectedMode];
                      const keysToShow = caps
                        ? allKeys.filter(({ key }) => caps[key])
                        : allKeys; // show all while caps loading
                      if (keysToShow.length === 0) {
                        return (
                          <div className="text-xs text-gray-500 px-1 py-1">
                            {t('routeControls.options.noneSelected')}
                          </div>
                        );
                      }
                      return keysToShow.map(({ key, label }) => {
                        const active = isolineOptions[key];
                        return (
                          <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-3 border rounded-lg px-3 py-2 mb-2 bg-white">
                            <div className="text-sm text-gray-800">{label}</div>
                            <button
                              type="button"
                              onClick={() => {
                                const next = { ...isolineOptions, [key]: !active };
                                setIsolineOptions(next);
                              }}
                              className={`justify-self-end relative inline-flex h-6 w-11 shrink-0 flex-none items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${active ? 'bg-blue-600' : 'bg-gray-200'}`}
                              title={active ? 'Disable' : 'Enable'}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`}
                              />
                              <span className="sr-only">{label}</span>
                            </button>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t('routeControls.isolines.dimension')}</label>
                  <select
                    className="w-full border rounded px-2 py-2 text-sm"
                    value={newDimension}
                    onChange={(e) => {
                      const dim = e.target.value === 'time' ? 'time' : 'distance';
                      setNewDimension(dim);
                      // Reset default value on profile change
                      setNewSizeInput(dim === 'time' ? '00:10:00' : '10000');
                    }}
                  >
                    {(availableDimsByMode[selectedMode] || ['time', 'distance']).map((d) => (
                      <option key={d} value={d}>
                        {d === 'time' ? t('routeControls.isolines.time') : t('routeControls.isolines.distance')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t('routeControls.isolines.size')}</label>
                  <input
                    type={newDimension === 'time' ? 'text' : 'number'}
                    className="w-full border rounded px-2 py-2 text-sm"
                    placeholder={newDimension === 'time' ? 'hh:mm:ss (ex: 00:10:00) ou secondes' : 'mètres (ex: 10000)'}
                    value={newSizeInput}
                    onChange={(e) => setNewSizeInput(e.target.value)}
                    min={newDimension === 'time' ? undefined : 1}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className={`text-xs ${items.length >= MAX_PROFILES ? 'text-red-600' : 'text-gray-500'}`}>
                  {items.length}/{MAX_PROFILES}
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  disabled={items.length >= MAX_PROFILES}
                  className={`inline-flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${items.length >= MAX_PROFILES ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  title={
                    items.length >= MAX_PROFILES
                      ? (t('routeControls.isolines.maxReached') as string)
                      : (!origin ? (t('routeControls.isolines.needOrigin') as string) : undefined)
                  }
                >
                  <FontAwesomeIcon icon={faPlus} className="h-4 w-4 mr-2" />
                  Ajouter
                </button>
              </div>
            </div>

            {/* Items list */}
            {items.length > 0 && (
              <div className="border rounded-lg bg-white p-3">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Isolignes</h3>
                <div className="space-y-2">
                  {items.map((item) => {
                    const successKeys = new Set(isolines.map(iso => `${iso.mode}|${iso.dimension}|${iso.size}`));
                    const itemKey = `${item.mode}|${item.dimension}|${item.size}`;
                    const isError = lastCalcAt > 0 && !!origin && !isCalculatingIsoline && !successKeys.has(itemKey);
                    return (
                    <div key={item.id} className={`flex flex-wrap items-start gap-2 border rounded px-3 py-2 ${isError ? 'border-red-300 bg-red-50' : ''}`}>
                      {/* Header row: mode label (left) + actions (right) */}
                      <div className="w-full flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FontAwesomeIcon
                            icon={getModeIcon(item.mode)!}
                            className="h-4 w-4"
                            style={{ color: getModeColor(item.mode) }}
                          />
                          <span className="text-sm font-medium text-gray-800 break-words">
                            {getModeLabel(item.mode, t)}
                          </span>
                          {isError && <span className="text-xs text-red-700 font-medium ml-1 break-words">Erreur</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {isCalculatingIsoline && (
                            <div
                              className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"
                              aria-label="Calcul en cours"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {/* Second row: dimension + size + active options badges */}
                      <div className="w-full flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.dimension === 'time'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                          title={item.dimension === 'time' ? String(t('routeControls.isolines.time')) : String(t('routeControls.isolines.distance'))}
                        >
                          {item.dimension === 'time' ? t('routeControls.isolines.time') : t('routeControls.isolines.distance')}
                        </span>
                        <span className="text-xs text-gray-700 break-words">
                          {item.dimension === 'time' ? formatTime(item.size) : `${item.size} m`}
                        </span>
                        {/* Active options badges */}
                        {item.options?.motorway && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800">
                            {t('routeControls.options.motorway')}
                          </span>
                        )}
                        {item.options?.toll && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800">
                            {t('routeControls.options.toll')}
                          </span>
                        )}
                        {item.options?.low_emission_zone && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800">
                            {t('routeControls.options.low_emission_zone')}
                          </span>
                        )}
                        {item.options?.track && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800">
                            {t('routeControls.options.track')}
                          </span>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500">{t('routeControls.isolines.hint')}</p>
          </div>
        </div>

        <div className={`${mapColSpan} order-1 lg:order-2`}>
          <div className="h-96 lg:h-[calc(100vh-200px)]">
            <MapIsolines
              onPointSelect={handlePointSelect}
              origin={origin}
              isolines={isolines}
            />
          </div>
        </div>

        {isDevMode && (
          <div className="lg:col-span-3 order-3 p-4 lg:p-0">
            <ApiRequestsPanel
              isDevMode={isDevMode}
              apiRequests={apiRequests}
              onClearApiRequests={() => setApiRequests([])}
              onExportApiRequests={() => {
                const dataStr = JSON.stringify(apiRequests, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `api-requests-isolines-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}


