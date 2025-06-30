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
  faLocationDot,
  faXmark
} from '@fortawesome/free-solid-svg-icons';
import { RoutePoint } from '../types/route';
import { TRANSPORT_MODES, getModeLabel } from '../config/transportModes';
import { useTranslation } from '../contexts/TranslationContext';

interface RouteControlsProps {
  origin: RoutePoint | null;
  destination: RoutePoint | null;
  selectedModes: string[];
  onModeToggle: (mode: string) => void;
  onPointSelect: (point: RoutePoint | null, type: 'origin' | 'destination') => void;
  isCalculating: boolean;
}

export const RouteControls: React.FC<RouteControlsProps> = ({
  origin,
  destination,
  selectedModes,
  onModeToggle,
  onPointSelect,
  isCalculating,
}) => {
  const { t } = useTranslation();

  const formatCoordinates = (point: RoutePoint) => {
    return `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 space-y-3 sm:space-y-3">
      <div className="flex items-center space-x-2">
        <FontAwesomeIcon icon={faLocationDot} className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">{t('routeControls.title')}</h2>
      </div>

      {/* Origin & Destination Status */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-2 sm:gap-3">
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3">
          <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between min-w-0">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white flex-shrink-0"></div>
                <div className="text-sm text-gray-500 truncate flex-1">
                  {origin ? formatCoordinates(origin) : t('routeControls.origin.label')}
                </div>
              </div>
              <button
                onClick={() => onPointSelect(null, 'origin')}
                className={`p-1 rounded transition-colors flex-shrink-0 ml-2 ${
                  origin
                    ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                    : 'text-transparent pointer-events-none'
                }`}
                title={t('routeControls.origin.removeTooltip')}
              >
                <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between min-w-0">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white flex-shrink-0"></div>
                <div className="text-sm text-gray-500 truncate flex-1">
                  {destination ? formatCoordinates(destination) : t('routeControls.destination.label')}
                </div>
              </div>
              <button
                onClick={() => onPointSelect(null, 'destination')}
                className={`p-1 rounded transition-colors flex-shrink-0 ml-2 ${
                  destination
                    ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                    : 'text-transparent pointer-events-none'
                }`}
                title={t('routeControls.destination.removeTooltip')}
              >
                <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transport Modes */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2 sm:mb-3">{t('routeControls.transportModes.title')}</h3>
        <div className="grid grid-cols-2 gap-2">
          {TRANSPORT_MODES.map(({ id, icon: Icon, color }) => (
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
