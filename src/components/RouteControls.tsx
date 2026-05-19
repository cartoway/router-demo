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

// ---- Shared helpers ----
function parseCoords(text: string): RoutePoint | null {
  const parts = text.trim().replace(/\s+/g, '').split(/[,:_ ]/).filter(Boolean);
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]), lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
function fmtCoords(p: RoutePoint) { return `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`; }

// ---- Shared address/geocode input ----
interface PointInputProps {
  value: RoutePoint | null;
  onChange: (p: RoutePoint | null) => void;
  onRemove: () => void;
  placeholder: string;
  leftAdornment: React.ReactNode;
  geocodeCountry: string;
  onApiRequestLog?: (request: ApiRequest) => void;
  onAdornmentMouseDown?: () => void;
  onAdornmentMouseUp?: () => void;
}

const PointInput: React.FC<PointInputProps> = ({
  value, onChange, onRemove, placeholder, leftAdornment, geocodeCountry, onApiRequestLog,
  onAdornmentMouseDown, onAdornmentMouseUp,
}) => {
  const [query, setQuery] = useState(() => value ? fmtCoords(value) : '');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const focusedRef = useRef(false);

  // Sync from external value (map click, URL load) only when not editing
  useEffect(() => {
    if (!focusedRef.current) setQuery(value ? fmtCoords(value) : '');
  }, [value]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const triggerSearch = (text: string) => {
    clearTimeout(timerRef.current);
    abortRef.current?.abort();
    setSuggestions([]);
    setActiveIdx(-1);
    if (parseCoords(text) || text.length < 3) return;
    console.debug('[geocode] scheduling search for:', text);
    timerRef.current = setTimeout(() => {
      const ac = new AbortController();
      abortRef.current = ac;
      geocodeSearch(text, ac.signal, { country: geocodeCountry }, onApiRequestLog)
        .then(r => { setSuggestions(r); setActiveIdx(-1); })
        .catch(err => { if (err?.name !== 'AbortError') console.error('[geocode]', err); setSuggestions([]); });
    }, 300);
  };

  const pickSuggestion = (s: GeocodeSuggestion) => {
    onChange({ lat: s.lat, lng: s.lng });
    setQuery(s.label);
    setSuggestions([]);
    setActiveIdx(-1);
  };

  const commit = () => {
    if (activeIdx >= 0 && suggestions[activeIdx]) {
      pickSuggestion(suggestions[activeIdx]);
      return;
    }
    const q = query.trim();
    const coords = parseCoords(q);
    if (coords) { onChange(coords); setSuggestions([]); }
    else if (!q) onChange(null);
    else setQuery(value ? fmtCoords(value) : ''); // reset if unresolvable
  };

  const closeSuggestions = () => {
    setTimeout(() => { setSuggestions([]); setActiveIdx(-1); }, 150);
  };

  return (
    <div className="relative">
      <span
        className={`absolute left-2.5 top-1/2 -translate-y-1/2${onAdornmentMouseDown ? '' : ' pointer-events-none'}`}
        onMouseDown={onAdornmentMouseDown}
        onMouseUp={onAdornmentMouseUp}
      >{leftAdornment}</span>
      <input
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        className="w-full h-9 pl-8 pr-8 border rounded text-sm bg-white"
        value={query}
        onChange={e => {
          const text = e.target.value;
          setQuery(text);
          if (!text) { onChange(null); setSuggestions([]); return; }
          triggerSearch(text.trim());
        }}
        onFocus={() => { focusedRef.current = true; }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx(i => Math.max(i - 1, -1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            setSuggestions([]);
            setActiveIdx(-1);
            (e.target as HTMLInputElement).blur();
          }
        }}
        onBlur={() => {
          focusedRef.current = false;
          closeSuggestions();
          commit();
        }}
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
      >
        <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
      </button>
      {suggestions.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border rounded shadow max-h-48 overflow-auto" onMouseDown={e => e.preventDefault()}>
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
              onClick={() => pickSuggestion(s)}
              className={`block w-full text-left px-3 py-2 text-sm ${i === activeIdx ? 'bg-blue-50 text-blue-800' : 'hover:bg-gray-100'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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
  const dragAllowedRef = useRef(false);
  const [geocodeCountry, setGeocodeCountry] = useState<string>('fr');

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
          {/* Origin */}
          <PointInput
            value={origin}
            onChange={p => onPointSelect(p, 'origin')}
            onRemove={() => onPointSelect(null, 'origin')}
            placeholder={t('routeControls.origin.addressPlaceholder')}
            leftAdornment={<span className="w-3 h-3 bg-green-500 rounded-full border-2 border-white inline-block" />}
            geocodeCountry={geocodeCountry}
            onApiRequestLog={onApiRequestLog}
          />

          {/* Viapoints */}
          {viapoints.map((via, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={e => {
                if (!dragAllowedRef.current) { e.preventDefault(); return; }
                dragFromIdxRef.current = idx;
              }}
              onDragOver={e => { e.preventDefault(); setDragOverIdx(idx); }}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={() => {
                if (dragFromIdxRef.current >= 0 && dragFromIdxRef.current !== idx) {
                  onViapointReorder?.(dragFromIdxRef.current, idx);
                }
                setDragOverIdx(null);
                dragFromIdxRef.current = -1;
              }}
              onDragEnd={() => { setDragOverIdx(null); dragFromIdxRef.current = -1; dragAllowedRef.current = false; }}
              className={`border-t-2 transition-colors ${dragOverIdx === idx ? 'border-blue-400' : 'border-transparent'}`}
            >
              <PointInput
                value={via}
                onChange={p => onViapointChange(idx, p)}
                onRemove={() => via ? onViapointChange(idx, null) : onViapointRemove(idx)}
                placeholder={`${t('routeControls.waypoint.addressPlaceholder')} ${idx + 1}`}
                leftAdornment={
                  <span className="flex items-center justify-center w-4 h-4 cursor-grab active:cursor-grabbing">
                    <FontAwesomeIcon icon={faGripLines} className="h-3 w-3 text-orange-400" />
                  </span>
                }
                onAdornmentMouseDown={() => { dragAllowedRef.current = true; }}
                onAdornmentMouseUp={() => { dragAllowedRef.current = false; }}
                geocodeCountry={geocodeCountry}
                onApiRequestLog={onApiRequestLog}
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

          {/* Destination */}
          <PointInput
            value={destination}
            onChange={p => onPointSelect(p, 'destination')}
            onRemove={() => onPointSelect(null, 'destination')}
            placeholder={t('routeControls.destination.addressPlaceholder')}
            leftAdornment={<span className="w-3 h-3 bg-red-500 rounded-full border-2 border-white inline-block" />}
            geocodeCountry={geocodeCountry}
            onApiRequestLog={onApiRequestLog}
          />
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
