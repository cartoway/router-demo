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

import React, { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLocationDot,
  faXmark,
  faChevronDown,
  faPlus,
  faGripLines
} from '@fortawesome/free-solid-svg-icons';
import { RoutePoint, Dimension } from '../types/route';
import { ENABLED_TRANSPORT_MODES, getModeLabel } from '../config/transportModes';
import { useTranslation } from '../contexts/TranslationContext';
import { geocodeSearch, GeocodeSuggestion } from '../services/geocoderApi';
import type { ApiRequest } from '../types/api';

interface RouteControlsProps {
  origin: RoutePoint | null;
  destination: RoutePoint | null;
  viapoints: (RoutePoint | null)[];
  onViapointChange: (index: number, point: RoutePoint | null) => void;
  onViapointAdd: () => void;
  onViapointRemove: (index: number) => void;
  onViapointReorder?: (from: number, to: number) => void;
  selectedModes: string[];
  onModeToggle: (mode: string) => void;
  onPointSelect: (point: RoutePoint | null, type: 'origin' | 'destination') => void;
  isCalculating: boolean;
  onApiRequestLog?: (request: ApiRequest) => void;
  capabilities?: Record<string, { motorway: boolean; toll: boolean; low_emission_zone: boolean; track: boolean }>;
  options?: { motorway: boolean; toll: boolean; low_emission_zone: boolean; track: boolean };
  onOptionsChange?: (opts: { motorway: boolean; toll: boolean; low_emission_zone: boolean; track: boolean }) => void;
  dimensions?: Dimension[];
  onDimensionChange?: (d: Dimension[]) => void;
}

// ---- ViaPointInput sub-component ----
interface ViaPointInputProps {
  index: number;
  value: RoutePoint | null;
  onChange: (point: RoutePoint | null) => void;
  onRemove: () => void;
  geocodeCountry: string;
  onApiRequestLog?: (request: ApiRequest) => void;
  t: (key: string) => string;
}

const ViaPointInput: React.FC<ViaPointInputProps> = ({
  index, value, onChange, onRemove, geocodeCountry, onApiRequestLog, t
}) => {
  const [query, setQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  const parseCoords = (text: string): { lat: number; lng: number } | null => {
    const cleaned = text.trim().replace(/\s+/g, '');
    const parts = cleaned.split(/[,:_ ]/).filter(Boolean);
    if (parts.length !== 2) return null;
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  };

  useEffect(() => {
    const q = debounced.trim();
    if (parseCoords(q)) { setSuggestions([]); return; }
    if (abortRef.current) abortRef.current.abort();
    if (q.length < 3) { setSuggestions([]); return; }
    const ac = new AbortController();
    abortRef.current = ac;
    geocodeSearch(q, ac.signal, { country: geocodeCountry }, onApiRequestLog)
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
    return () => ac.abort();
  }, [debounced, geocodeCountry, onApiRequestLog]);

  useEffect(() => {
    if (value) {
      setQuery(`${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`);
    } else {
      setQuery('');
    }
  }, [value]);

  const pick = (s: GeocodeSuggestion) => {
    onChange({ lat: s.lat, lng: s.lng });
    setQuery(s.label);
    setSuggestions([]);
  };
  const tryApplyCoords = () => {
    const coords = parseCoords(query);
    if (coords) { onChange(coords); setSuggestions([]); }
  };

  return (
    <div className="bg-gray-50 rounded-lg">
      <div className="relative">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4 cursor-grab active:cursor-grabbing">
            <FontAwesomeIcon icon={faGripLines} className="h-3 w-3 text-orange-400" />
          </span>
          <input
            type="text"
            placeholder={`${t('routeControls.waypoint.addressPlaceholder')} ${index + 1}`}
            className="w-full h-9 px-3 pr-10 pl-8 border rounded text-sm"
            value={query}
            onChange={e => { setQuery(e.target.value); if (!e.target.value) onChange(null); }}
            onFocus={e => e.target.select()}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); tryApplyCoords(); } }}
            onBlur={() => { if (query !== (value ? `${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}` : '')) tryApplyCoords(); }}
          />
          <button
            type="button"
            onClick={() => {
              if (value) {
                onChange(null);
                setQuery('');
                setSuggestions([]);
              } else {
                onRemove();
              }
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-500 hover:text-red-600 hover:bg-red-50"
            title={t('routeControls.waypoint.removeTooltip')}
          >
            <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-48 overflow-auto">
            {parseCoords(query) && (
              <button
                type="button"
                onClick={tryApplyCoords}
                className="block w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 text-sm"
              >
                {`Utiliser ces coordonnées: ${query}`}
              </button>
            )}
            {suggestions.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => pick(s)}
                className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const RouteControls: React.FC<RouteControlsProps> = ({
  origin,
  destination,
  viapoints,
  onViapointChange,
  onViapointAdd,
  onViapointRemove,
  onViapointReorder,
  selectedModes,
  onModeToggle,
  onPointSelect,
  isCalculating,
  onApiRequestLog,
  capabilities = {},
  options = { motorway: false, toll: false, low_emission_zone: false, track: false },
  onOptionsChange,
  dimensions = ['time'],
  onDimensionChange,
}) => {
  const { t } = useTranslation();

  const [optionsOpen, setOptionsOpen] = useState<boolean>(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragFromIdxRef = useRef<number>(-1);

  const formatCoordinates = (point: RoutePoint) => {
    return `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
  };

  // Address inputs & suggestions
  const [originQuery, setOriginQuery] = useState<string>('');
  const [destQuery, setDestQuery] = useState<string>('');
  const [originSuggestions, setOriginSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<GeocodeSuggestion[]>([]);
  const originAbortRef = useRef<AbortController | null>(null);
  const destAbortRef = useRef<AbortController | null>(null);

  // Geocoding country selection (default FR)
  const [geocodeCountry, setGeocodeCountry] = useState<string>('fr');

  // Parse coordinates from free text: supports "lat,lng" "lat:lng" "lat lng" "lat_lng"
  const parseCoords = (text: string): { lat: number; lng: number } | null => {
    const cleaned = text.trim().replace(/\s+/g, '');
    const parts = cleaned.split(/[,:_ ]/).filter(Boolean);
    if (parts.length !== 2) return null;
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  };

  // Debounce helper
  const useDebounced = (value: string, delay = 300) => {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      const id = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
  };
  const originDebounced = useDebounced(originQuery);
  const destDebounced = useDebounced(destQuery);

  // Search origin suggestions
  useEffect(() => {
    const q = originDebounced.trim();
    if (parseCoords(q)) { setOriginSuggestions([]); return; }
    if (originAbortRef.current) originAbortRef.current.abort();
    if (q.length < 3) { setOriginSuggestions([]); return; }
    const ac = new AbortController();
    originAbortRef.current = ac;
    geocodeSearch(q, ac.signal, { country: geocodeCountry }, onApiRequestLog).then(setOriginSuggestions).catch(() => setOriginSuggestions([]));
    return () => ac.abort();
  }, [originDebounced, geocodeCountry, onApiRequestLog]);

  // Search destination suggestions
  useEffect(() => {
    const q = destDebounced.trim();
    if (parseCoords(q)) { setDestSuggestions([]); return; }
    if (destAbortRef.current) destAbortRef.current.abort();
    if (q.length < 3) { setDestSuggestions([]); return; }
    const ac = new AbortController();
    destAbortRef.current = ac;
    geocodeSearch(q, ac.signal, { country: geocodeCountry }, onApiRequestLog).then(setDestSuggestions).catch(() => setDestSuggestions([]));
    return () => ac.abort();
  }, [destDebounced, geocodeCountry, onApiRequestLog]);

  const pickOrigin = (s: GeocodeSuggestion) => {
    onPointSelect({ lat: s.lat, lng: s.lng }, 'origin');
    setOriginQuery(s.label);
    setOriginSuggestions([]);
  };
  const pickDestination = (s: GeocodeSuggestion) => {
    onPointSelect({ lat: s.lat, lng: s.lng }, 'destination');
    setDestQuery(s.label);
    setDestSuggestions([]);
  };

  const tryApplyOriginCoords = () => {
    const coords = parseCoords(originQuery);
    if (coords) {
      onPointSelect(coords, 'origin');
      setOriginSuggestions([]);
      return true;
    }
    return false;
  };
  const tryApplyDestCoords = () => {
    const coords = parseCoords(destQuery);
    if (coords) {
      onPointSelect(coords, 'destination');
      setDestSuggestions([]);
      return true;
    }
    return false;
  };

  // Sync input with coordinates when set externally (e.g., map click) and field empty
  useEffect(() => {
    if (origin) {
      setOriginQuery(formatCoordinates(origin));
    } else {
      setOriginQuery('');
    }
  }, [origin]);
  useEffect(() => {
    if (destination) {
      setDestQuery(formatCoordinates(destination));
    } else {
      setDestQuery('');
    }
  }, [destination]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 space-y-3 sm:space-y-3">
      <div className="flex items-center space-x-2">
        <FontAwesomeIcon icon={faLocationDot} className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">{t('routeControls.title')}</h2>
      </div>

      {/* Origin & Destination Status */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-2 sm:gap-3">
        {/* Geocoding country selector */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-gray-600">Pays géocodage</span>
          <select
            className="text-xs border rounded px-2 py-1"
            value={geocodeCountry}
            onChange={(e) => setGeocodeCountry(e.target.value)}
          >
            <option value="fr">France</option>
          </select>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:gap-3">
          <div className="bg-gray-50 rounded-lg">
            {/* Address input - origin */}
            <div className="relative">
                <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white"></span>
                <input
                  type="text"
                  placeholder={t('routeControls.origin.addressPlaceholder')}
                  className="w-full h-9 px-3 pr-10 pl-8 border rounded text-sm"
                  value={originQuery}
                  onChange={e => { setOriginQuery(e.target.value); if (!e.target.value) onPointSelect(null, 'origin'); }}
                  onFocus={e => e.target.select()}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); tryApplyOriginCoords(); } }}
                  onBlur={() => { if (originQuery !== (origin ? formatCoordinates(origin) : '')) tryApplyOriginCoords(); }}
                />
                  <button
                    type="button"
                    onClick={() => onPointSelect(null, 'origin')}
                    disabled={!origin}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded ${origin ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}
                    title={t('routeControls.origin.removeTooltip')}
                  >
                    <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                  </button>
                </div>
              {originSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-48 overflow-auto">
                  {parseCoords(originQuery) && (
                    <button
                      type="button"
                      onClick={tryApplyOriginCoords}
                      className="block w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 text-sm"
                    >
                      {`Utiliser ces coordonnées: ${originQuery}`}
                    </button>
                  )}
                  {originSuggestions.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pickOrigin(s)}
                      className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Saisie via adresse ou coordonnées dans le champ ci-dessus */}
          </div>

          {/* Viapoints */}
          {viapoints.map((via, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => { dragFromIdxRef.current = idx; }}
              onDragOver={e => { e.preventDefault(); setDragOverIdx(idx); }}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={() => {
                if (dragFromIdxRef.current >= 0 && dragFromIdxRef.current !== idx) {
                  onViapointReorder?.(dragFromIdxRef.current, idx);
                }
                setDragOverIdx(null);
                dragFromIdxRef.current = -1;
              }}
              onDragEnd={() => { setDragOverIdx(null); dragFromIdxRef.current = -1; }}
              className={`border-t-2 transition-colors ${dragOverIdx === idx ? 'border-blue-400' : 'border-transparent'}`}
            >
              <ViaPointInput
                index={idx}
                value={via}
                onChange={(point) => onViapointChange(idx, point)}
                onRemove={() => onViapointRemove(idx)}
                geocodeCountry={geocodeCountry}
                onApiRequestLog={onApiRequestLog}
                t={t}
              />
            </div>
          ))}

          {/* Add viapoint button */}
          <button
            type="button"
            onClick={onViapointAdd}
            className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 px-1 py-1"
          >
            <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
            <span>{t('routeControls.waypoint.addButton')}</span>
          </button>

          <div className="bg-gray-50 rounded-lg">
            {/* Address input - destination */}
            <div className="mb-2 relative">
                <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full border-2 border-white"></span>
                <input
                  type="text"
                  placeholder={t('routeControls.destination.addressPlaceholder')}
                  className="w-full h-9 px-3 pr-10 pl-8 border rounded text-sm"
                  value={destQuery}
                  onChange={e => { setDestQuery(e.target.value); if (!e.target.value) onPointSelect(null, 'destination'); }}
                  onFocus={e => e.target.select()}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); tryApplyDestCoords(); } }}
                  onBlur={() => { if (destQuery !== (destination ? formatCoordinates(destination) : '')) tryApplyDestCoords(); }}
                />
                  <button
                    type="button"
                    onClick={() => onPointSelect(null, 'destination')}
                    disabled={!destination}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded ${destination ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}
                    title={t('routeControls.destination.removeTooltip')}
                  >
                    <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                  </button>
                </div>
              {destSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-48 overflow-auto">
                  {parseCoords(destQuery) && (
                    <button
                      type="button"
                      onClick={tryApplyDestCoords}
                      className="block w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 text-sm"
                    >
                      {`Utiliser ces coordonnées: ${destQuery}`}
                    </button>
                  )}
                  {destSuggestions.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pickDestination(s)}
                      className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Saisie via adresse ou coordonnées dans le champ ci-dessus */}
          </div>
        </div>
      </div>

      {/* Transport Modes */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2 sm:mb-3">{t('routeControls.transportModes.title')}</h3>
        <div className="grid grid-cols-2 gap-2">
          {ENABLED_TRANSPORT_MODES.map(({ id, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => onModeToggle(id)}
              className={`flex items-center space-x-1 sm:space-x-2 p-2 sm:p-3 rounded-lg border-2 transition-all duration-200 ${
                selectedModes.includes(id)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FontAwesomeIcon icon={Icon} className="h-3 w-3 sm:h-4 sm:w-4" style={{ color: selectedModes.includes(id) ? color : undefined }} />
              <span className="text-xs sm:text-sm font-medium">{getModeLabel(id, t)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dimension selector */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2 sm:mb-3">{t('routeControls.isolines.dimension')}</h3>
        <div className="space-y-2">
          {(['time', 'distance'] as Dimension[]).map((d) => {
            const isChecked = dimensions.includes(d);
            const isLast = dimensions.length === 1 && isChecked;
            const label = d === 'time' ? t('routeControls.isolines.time') : t('routeControls.isolines.distance');
            return (
              <div key={d} className="grid grid-cols-[1fr_auto] items-center gap-3 border rounded-lg px-3 py-2 bg-white">
                <div className="text-sm text-gray-800">{label}</div>
                <button
                  type="button"
                  onClick={() => {
                    if (!onDimensionChange || isLast) return;
                    if (isChecked) {
                      onDimensionChange(dimensions.filter(x => x !== d));
                    } else {
                      onDimensionChange([...dimensions, d]);
                    }
                  }}
                  className={`justify-self-end relative inline-flex h-6 w-11 shrink-0 flex-none items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isChecked ? 'bg-blue-600' : 'bg-gray-200'} ${isLast ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={isLast ? '' : isChecked ? 'Désactiver' : 'Activer'}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isChecked ? 'translate-x-6' : 'translate-x-1'}`} />
                  <span className="sr-only">{label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Routing Options - Accordion */}
      <div className="border rounded-lg bg-white">
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
          {[
            { key: 'motorway' as const, label: t('routeControls.options.motorway') },
            { key: 'toll' as const, label: t('routeControls.options.toll') },
            { key: 'low_emission_zone' as const, label: t('routeControls.options.low_emission_zone') },
            { key: 'track' as const, label: t('routeControls.options.track') },
          ].map(({ key, label }) => {
            const supportedModes = selectedModes.filter(m => capabilities[m]?.[key]);
            const unsupportedModes = selectedModes.filter(m => !capabilities[m]?.[key]);
            const active = options[key];
            const disabled = selectedModes.length > 0 && supportedModes.length === 0;
            return (
              <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-3 border rounded-lg px-3 py-2 mb-2 bg-white">
                <div className="min-w-0">
                  <div className="text-sm text-gray-800">{label}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedModes.length === 0 && (
                      <span className="text-xs text-gray-500">{t('routeControls.options.noneSelected')}</span>
                    )}
                    {supportedModes.length > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                        {t('routeControls.options.supportedLabel')} {supportedModes.join(', ')}
                      </span>
                    )}
                    {unsupportedModes.length > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                        {t('routeControls.options.unsupportedLabel')} {unsupportedModes.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOptionsChange && onOptionsChange({ ...options, [key]: !active })}
                  className={`justify-self-end relative inline-flex h-6 w-11 shrink-0 flex-none items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${active ? 'bg-blue-600' : 'bg-gray-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={disabled ? 'Aucun des modes sélectionnés ne supporte cette option' : active ? 'Désactiver' : 'Activer'}
                  disabled={false}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                  <span className="sr-only">{label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status*/}
      { isCalculating && (
      <div className="flex items-center justify-center bg-blue-50 rounded-lg transition-all duration-300 ease-in-out overflow-hidden opacity-100 max-h-20 py-2 sm:py-3 px-2 sm:px-3 transform translate-y-0"
      >
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
        <span className="text-sm text-blue-700 font-medium">{t('routeControls.status.calculating')}</span>
      </div>
      )}

      {/* Mode Selection Warning */}
      {origin && destination && selectedModes.length === 0 && (
        <div className={`flex items-center justify-center p-2 sm:p-3 bg-yellow-50 rounded-lg border border-yellow-200 ${isCalculating ? 'mt-2 sm:mt-3' : ''}`}>
          <span className="text-sm text-yellow-700 font-medium">
            {t('routeControls.transportModes.selectMode')}
          </span>
        </div>
      )}
    </div>
  );
};
