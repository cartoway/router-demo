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

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faLocationDot,
  faBolt,
  faSquareParking,
  faDroplet,
  faGasPump,
} from '@fortawesome/free-solid-svg-icons';
import { getModeLabel, getModeIcon, PARKING_TIMES, calculateCo2, calculateFuelCost } from '../config/transportModes';
import { useTranslation } from '../contexts/TranslationContext';
import { ApiRequest } from '../types/api';
import { RouteResult } from '../types/route';
import ApiRequestsPanel from './ApiRequestsPanel';

interface RouteResultsProps {
  routes: RouteResult[];
  selectedModes: string[];
  isDevMode?: boolean;
  apiRequests?: ApiRequest[];
  onClearApiRequests?: () => void;
  onExportApiRequests?: () => void;
}

export const RouteResults: React.FC<RouteResultsProps> = ({
  routes,
  selectedModes,
  isDevMode = false,
  apiRequests = [],
  onClearApiRequests,
  onExportApiRequests,
}) => {
  const { t } = useTranslation();

  // Filtrer les routes selon les modes sélectionnés
  const filteredRoutes = routes.filter(route => selectedModes.includes(route.mode));
  const validRoutes = filteredRoutes.filter(r => !r.error);

  if (filteredRoutes.length === 0 && !isDevMode) {
    return null;
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}\u00a0h\u00a0${minutes}\u00a0min`;
    }
    return `${minutes}\u00a0min`;
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}\u00a0km`;
    }
    return `${Math.round(meters)}\u00a0m`;
  };

  const formatCo2 = (kg: number): string => {
    if (kg >= 1) {
      return `${kg.toFixed(2)}\u00a0kg\u00a0CO\u2082`;
    }
    return `${(kg * 1000).toFixed(0)}\u00a0g\u00a0CO\u2082`;
  };

  const formatPrice = (euros: number): string => {
    return `${euros.toFixed(2)}\u00a0€`;
  };

  const co2Values = validRoutes
    .map(r => ({ mode: r.mode, co2: calculateCo2(r.mode, r.distance) }))
    .filter(v => v.co2 !== undefined);
  const lowestCo2 = co2Values.length > 0 ? Math.min(...co2Values.map(v => v.co2!)) : null;

  return (
    <div className="space-y-6">
      {/* Route Results */}
      {filteredRoutes.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          <div className="flex items-center space-x-2 mb-3 sm:mb-4">
            <FontAwesomeIcon icon={faBolt} className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">{t('routeResults.title')}</h3>
          </div>

          <div className="space-y-2 sm:space-y-3">
            {filteredRoutes.map((route) => {
              const parkingTime = PARKING_TIMES[route.mode] ?? 0;
              const totalDuration = route.duration + parkingTime;
              const icon = getModeIcon(route.mode);
              return (
                <div
                  key={`${route.mode}-${route.dimension}`}
                  className={`border-2 rounded-lg p-3 sm:p-4 transition-all duration-200 ${route.error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'} shadow-sm`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      {icon ? (
                        <FontAwesomeIcon icon={icon} className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" style={{ color: route.color }} />
                      ) : (
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0" style={{ backgroundColor: route.color }} />
                      )}
                      <span className="font-medium text-gray-900 text-sm sm:text-base">
                        {getModeLabel(route.mode, t)}
                      </span>
                      <span className="text-xs text-gray-500 italic">
                        {route.dimension === 'distance' ? t('routeControls.isolines.distance') : t('routeControls.isolines.time')}
                      </span>
                      <svg width="28" height="8" viewBox="0 0 28 8" className="flex-shrink-0">
                        <line x1="2" y1="4" x2="26" y2="4"
                          stroke={route.color} strokeWidth="3" strokeLinecap="round"
                          strokeDasharray={route.dimension === 'distance' ? '4 5' : undefined}
                        />
                      </svg>
                    </div>
                  </div>

                  {!route.error ? (
                    <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <FontAwesomeIcon icon={faClock} className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                        <span className="text-gray-700">
                          {formatDuration(totalDuration)}{parkingTime > 0 && <> {t('routeResults.routeTime')} {formatDuration(route.duration)}</>}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <FontAwesomeIcon icon={faLocationDot} className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                        <span className="text-gray-700">
                          {formatDistance(route.distance)}
                        </span>
                      </div>
                      {parkingTime > 0 && (
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <FontAwesomeIcon icon={faSquareParking} className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                          <span>{formatDuration(parkingTime)}</span>
                        </div>
                      )}
                      {(() => {
                        const co2 = calculateCo2(route.mode, route.distance);
                        if (co2 === undefined) return null;
                        return (
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            <FontAwesomeIcon icon={faDroplet} className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                            <span className="text-gray-700">
                              {formatCo2(co2)}
                            </span>
                          </div>
                        );
                      })()}
                      {(() => {
                        const fuelCost = calculateFuelCost(route.mode, route.distance);
                        if (fuelCost === undefined || fuelCost === 0) return null;
                        return (
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            <FontAwesomeIcon icon={faGasPump} className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                            <span className="text-gray-700">
                              {formatPrice(fuelCost)}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600">
                      {t('errors.calculationError')}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1">
                    {!route.error && validRoutes.length > 0 && totalDuration === Math.min(...validRoutes.map(r => r.duration + (PARKING_TIMES[r.mode] ?? 0))) && (
                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {t('routeResults.fastest')}
                      </div>
                    )}
                    {!route.error && validRoutes.length > 0 && route.distance === Math.min(...validRoutes.map(r => r.distance)) && (
                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {t('routeResults.shortest')}
                      </div>
                    )}
                    {!route.error && lowestCo2 !== null && (() => {
                      const co2 = calculateCo2(route.mode, route.distance);
                      if (co2 !== undefined && co2 === lowestCo2) {
                        return (
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {t('routeResults.leastPolluting')}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ApiRequestsPanel
        isDevMode={isDevMode}
        apiRequests={apiRequests}
        onClearApiRequests={onClearApiRequests}
        onExportApiRequests={onExportApiRequests}
      />
    </div>
  );
};
