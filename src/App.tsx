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

import React, { useState, useEffect } from 'react';
import { MapComponent } from './components/MapComponent';
import { RouteControls } from './components/RouteControls';
import { RouteResults } from './components/RouteResults';
import { Header } from './components/Header';
import { useRouteCalculation } from './hooks/useRouteCalculation';
import { useTranslation } from './contexts/TranslationContext';
import { RoutePoint } from './types/route';

function App() {
  const [origin, setOrigin] = useState<RoutePoint | null>(null);
  const [destination, setDestination] = useState<RoutePoint | null>(null);
  const [selectedModes, setSelectedModes] = useState<string[]>(['car', 'cargo_bike']);
  const [visibleRoutes, setVisibleRoutes] = useState<string[]>([]);

  const { routes, isCalculating, error, calculateRoutes, clearRoutes } = useRouteCalculation();
  const { t } = useTranslation();

  // Auto-calculate routes when both points are set and modes are selected
  useEffect(() => {
    if (origin && destination) {
      if (selectedModes.length > 0) {
        // Calculate routes if modes are selected
        calculateRoutes(origin, destination, selectedModes);
        setVisibleRoutes(selectedModes);
      } else {
        // Clear routes if no modes are selected
        clearRoutes();
        setVisibleRoutes([]);
      }
    }
  }, [origin, destination, selectedModes, calculateRoutes, clearRoutes]);

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

  const handleToggleRouteVisibility = (mode: string) => {
    setVisibleRoutes(prev =>
      prev.includes(mode)
        ? prev.filter(m => m !== mode)
        : [...prev, mode]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      {/* Main Content */}
      <div className="max-w-full mx-auto px-0 lg:px-8 py-0 lg:py-6">
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
            {routes.length > 0 && (
              <RouteResults
                routes={routes}
                visibleRoutes={visibleRoutes}
                onToggleRouteVisibility={handleToggleRouteVisibility}
              />
            )}
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
      <footer className="lg:hidden bg-white border-t py-4">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            {t('app.poweredBy')}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
