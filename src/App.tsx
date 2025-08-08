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

import React, { useState, useEffect, useRef } from 'react';
import { MapComponent } from './components/MapComponent';
import { RouteControls } from './components/RouteControls';
import { RouteResults } from './components/RouteResults';
import { Header } from './components/Header';
import { useRouteCalculation } from './hooks/useRouteCalculation';
import { RoutePoint, RouteResult } from './types/route';
import { ApiRequest } from './types/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBug } from '@fortawesome/free-solid-svg-icons';
import { ENABLED_TRANSPORT_MODES, TransportMode, ACTIVE_TRANSPORT_MODES } from './config/transportModes';

function App() {
  const [origin, setOrigin] = useState<RoutePoint | null>(null);
  const [destination, setDestination] = useState<RoutePoint | null>(null);

  const initialSelectedModesFromUrl: string[] | null = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const modesParam = params.get('modes');
      if (!modesParam) return null;
      const normalized = modesParam.replace(/%2C/ig, ',').replace(/%3B/ig, ';');
      const parsed = normalized
        .split(/[;,]/)
        .map((m) => m.trim().toLowerCase())
        .filter((m) => m.length > 0);
      return parsed.length > 0 ? parsed : null;
    } catch {
      return null;
    }
  })();

  const [selectedModes, setSelectedModes] = useState<string[]>(() => {
    if (initialSelectedModesFromUrl) {
      return initialSelectedModesFromUrl;
    }
    // Initialize with ACTIVE_TRANSPORT_MODES, or default to first 2 enabled modes
    if (ACTIVE_TRANSPORT_MODES.length > 0) {
      return ACTIVE_TRANSPORT_MODES;
    }
    const enabledModeIds = ENABLED_TRANSPORT_MODES.map((mode: TransportMode) => mode.id);
    return enabledModeIds.length >= 2 ? enabledModeIds.slice(0, 2) : ['car', 'cargo_bike'];
  });
  const [visibleRoutes, setVisibleRoutes] = useState<string[]>([]);
  const [isDevMode, setIsDevMode] = useState(false);
  const [apiRequests, setApiRequests] = useState<ApiRequest[]>([]);

  // Refs to track previous points and routes
  const prevOrigin = useRef<RoutePoint | null>(null);
  const prevDestination = useRef<RoutePoint | null>(null);
  const prevRoutes = useRef<RouteResult[]>([]);

  const { routes, isCalculating, error, calculateRoutes, clearRoutes } = useRouteCalculation();

  // Helper: parse coordinate string with separators ':', '_' or ','
  const parseLatLng = (value: string | null): RoutePoint | null => {
    if (!value) return null;
    const parts = value.split(/[:_,]/);
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
    return { lat, lng };
  };

  // On first load: read URL params and initialize state
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const srcStr = params.get('src');
    const dstStr = params.get('dst');

    const originParam = parseLatLng(srcStr);
    const destinationParam = parseLatLng(dstStr);
    const modesParam = params.get('modes');
    const debugParam = params.get('debug');

    if (originParam) setOrigin(originParam);
    if (destinationParam) setDestination(destinationParam);

    if (modesParam) {
      const normalized = modesParam
        .replace(/%2C/ig, ',')
        .replace(/%3B/ig, ';');
      const parsedModes = normalized
        .split(/[;,]/)
        .map(m => m.trim().toLowerCase())
        .filter(m => m.length > 0);
      if (parsedModes.length > 0) {
        setSelectedModes(parsedModes);
      }
    }

    if (debugParam) {
      setIsDevMode(debugParam === '1' || debugParam.toLowerCase() === 'true');
    }
  }, []);

  // Keep URL in sync with state
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (origin) {
      params.set('src', `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}`);
    } else {
      params.delete('src');
    }

    if (destination) {
      params.set('dst', `${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}`);
    } else {
      params.delete('dst');
    }

    if (selectedModes.length > 0) {
      params.set('modes', selectedModes.join(','));
    } else {
      params.delete('modes');
    }

    if (isDevMode) {
      params.set('debug', '1');
    } else {
      params.delete('debug');
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [origin, destination, selectedModes, isDevMode]);

  // Handle API request logging
  const handleApiRequest = (request: ApiRequest) => {
    if (isDevMode) {
      setApiRequests(prev => {
        // Extract mode from request URL or data
        const mode = extractModeFromRequest(request);

        // Remove any existing request for this mode
        const filtered = prev.filter(r => extractModeFromRequest(r) !== mode);

        // Add the new request
        return [...filtered, request];
      });
    }
  };

  // Extract transport mode from request
  const extractModeFromRequest = (request: ApiRequest): string | null => {
    // Try to extract mode from URL
    const urlMatch = request.url.match(/[?&]mode=([^&]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    // Try to extract mode from request data
    if (request.requestData && typeof request.requestData === 'object') {
      const data = request.requestData as Record<string, unknown>;
      if (data.mode && typeof data.mode === 'string') {
        return data.mode;
      }
    }

    return null;
  };

  // Filter API requests to only show selected modes
  const filteredApiRequests = apiRequests.filter(request => {
    const mode = extractModeFromRequest(request);
    return mode && selectedModes.includes(mode);
  });

  // Toggle dev mode
  const toggleDevMode = () => {
    setIsDevMode(!isDevMode);
  };

  // Clear API requests
  const clearApiRequests = () => {
    setApiRequests([]);
  };

  // Export API requests
  const exportApiRequests = () => {
    const dataStr = JSON.stringify(filteredApiRequests, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `api-requests-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Auto-calculate routes when both points are set and modes are selected
  useEffect(() => {
    if (origin && destination) {
      if (selectedModes.length > 0) {
        // Check if points have changed
        const pointsChanged =
          prevOrigin.current?.lat !== origin.lat ||
          prevOrigin.current?.lng !== origin.lng ||
          prevDestination.current?.lat !== destination.lat ||
          prevDestination.current?.lng !== destination.lng;

        if (pointsChanged) {
          // Recalculate all routes when points change
          calculateRoutes(origin, destination, selectedModes, handleApiRequest);
        } else {
          // Check if we need to calculate new modes
          const existingModes = prevRoutes.current.map(route => route.mode);
          const newModes = selectedModes.filter(mode => !existingModes.includes(mode));

          if (newModes.length > 0) {
            // Calculate only new routes
            calculateRoutes(origin, destination, newModes, handleApiRequest);
          }
        }

        // Update prevRoutes ref
        prevRoutes.current = routes;

        // Update visible routes to include all selected modes
        setVisibleRoutes(selectedModes);

        // Update refs
        prevOrigin.current = origin;
        prevDestination.current = destination;
      } else {
        // Clear routes if no modes are selected
        clearRoutes();
        setVisibleRoutes([]);
      }
    }
  }, [origin, destination, selectedModes, calculateRoutes, clearRoutes]); // Removed routes dependency

  const handlePointSelect = (point: RoutePoint | null, type: 'origin' | 'destination') => {
    if (type === 'origin') {
      setOrigin(point);
      // Clear routes if origin is removed
      if (!point) {
        clearRoutes();
        setVisibleRoutes([]);
      }
    } else {
      setDestination(point);
      // Clear routes if destination is removed
      if (!point) {
        clearRoutes();
        setVisibleRoutes([]);
      }
    }
  };

  const handleModeToggle = (mode: string) => {
    setSelectedModes(prev =>
      prev.includes(mode)
        ? prev.filter(m => m !== mode)
        : [...prev, mode]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header isDevMode={isDevMode} onToggleDevMode={toggleDevMode} />
      {/* Main Content */}
      <div className="max-w-full mx-auto px-0 lg:px-8 py-0 lg:py-6 pb-20 lg:pb-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-4">

          {/* Left Sidebar - Controls */}
          <div className="lg:col-span-3 space-y-6 order-2 lg:order-1 p-4 lg:p-0">
            <RouteControls
              origin={origin}
              destination={destination}
              selectedModes={selectedModes}
              onModeToggle={handleModeToggle}
              onPointSelect={handlePointSelect}
              isCalculating={isCalculating}
            />
          </div>

          {/* Main Map Area */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            <div className="h-96 lg:h-[calc(100vh-200px)]">
              <MapComponent
                onPointSelect={handlePointSelect}
                origin={origin}
                destination={destination}
                routes={routes}
                visibleRoutes={visibleRoutes}
              />
            </div>
          </div>

          {/* Right Sidebar - Results */}
          <div className="lg:col-span-3 space-y-6 order-3 p-4 lg:p-0">
            <RouteResults
              routes={routes}
              selectedModes={selectedModes}
              isDevMode={isDevMode}
              apiRequests={filteredApiRequests}
              onClearApiRequests={clearApiRequests}
              onExportApiRequests={exportApiRequests}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Footer - Mobile only */}
      <footer className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t py-4 z-10">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="text-center text-sm text-gray-500">
              Powered by{' '}
              <a
                href="https://cartoway.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                Cartoway
              </a>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <FontAwesomeIcon icon={faBug} className={`h-4 w-4 ${isDevMode ? 'text-red-600' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${isDevMode ? 'text-red-700' : 'text-gray-500'}`}>
                  Dev
                </span>
              </div>
              <button
                onClick={toggleDevMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isDevMode ? 'bg-red-600' : 'bg-gray-200'
                }`}
                title={isDevMode ? 'Disable developer mode' : 'Enable developer mode'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isDevMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
                <span className="sr-only">
                  {isDevMode ? 'Disable developer mode' : 'Enable developer mode'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
