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
  faEye,
  faEyeSlash
} from '@fortawesome/free-solid-svg-icons';
import { RouteResult } from '../types/route';
import { getModeLabel } from '../config/transportModes';
import { useTranslation } from '../contexts/TranslationContext';

interface RouteResultsProps {
  routes: RouteResult[];
  visibleRoutes: string[];
  onToggleRouteVisibility: (mode: string) => void;
}

export const RouteResults: React.FC<RouteResultsProps> = ({
  routes,
  visibleRoutes,
  onToggleRouteVisibility,
}) => {
  const { t } = useTranslation();

  if (routes.length === 0) {
    return null;
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <div className="flex items-center space-x-2 mb-3 sm:mb-4">
        <FontAwesomeIcon icon={faBolt} className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">{t('routeResults.title')}</h3>
      </div>

      <div className="space-y-2 sm:space-y-3">
        {routes.map((route) => {
          const isVisible = visibleRoutes.includes(route.mode);

          return (
            <div
              key={route.mode}
              className={`border-2 rounded-lg p-3 sm:p-4 transition-all duration-200 ${
                isVisible
                  ? 'border-gray-300 bg-white shadow-sm'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div
                    className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: route.color }}
                  />
                  <span className="font-medium text-gray-900 text-sm sm:text-base">
                    {getModeLabel(route.mode)}
                  </span>
                </div>
                <button
                  onClick={() => onToggleRouteVisibility(route.mode)}
                  className={`p-1 rounded transition-colors duration-200 flex-shrink-0 ${
                    isVisible
                      ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {isVisible ? <FontAwesomeIcon icon={faEye} className="h-4 w-4" /> : <FontAwesomeIcon icon={faEyeSlash} className="h-4 w-4" />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <FontAwesomeIcon icon={faClock} className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-700">
                    {formatDuration(route.duration)}
                  </span>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <FontAwesomeIcon icon={faLocationDot} className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-700">
                    {formatDistance(route.distance)}
                  </span>
                </div>
              </div>

              {route.duration === Math.min(...routes.map(r => r.duration)) && (
                <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {t('routeResults.fastest')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
