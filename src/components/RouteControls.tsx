import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLocationDot,
  faXmark
} from '@fortawesome/free-solid-svg-icons';
import { RoutePoint } from '../types/route';
import { TRANSPORT_MODES } from '../config/transportModes';
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
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center space-x-2">
        <FontAwesomeIcon icon={faLocationDot} className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">{t('routeControls.title')}</h2>
      </div>

      {/* Origin & Destination Status */}
      <div className="space-y-2 sm:space-y-3">
        <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">{t('routeControls.origin.label')}</span>
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${origin ? 'text-green-600' : 'text-gray-400'}`}>
                {origin ? t('routeControls.origin.defined') : t('routeControls.origin.notDefined')}
              </span>
              {origin && (
                <button
                  onClick={() => onPointSelect(null, 'origin')}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title={t('routeControls.origin.removeTooltip')}
                >
                  <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          {origin && (
            <div className="text-xs text-gray-500 font-mono">
              {formatCoordinates(origin)}
            </div>
          )}
        </div>

        <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">{t('routeControls.destination.label')}</span>
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${destination ? 'text-green-600' : 'text-gray-400'}`}>
                {destination ? t('routeControls.destination.defined') : t('routeControls.destination.notDefined')}
              </span>
              {destination && (
                <button
                  onClick={() => onPointSelect(null, 'destination')}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title={t('routeControls.destination.removeTooltip')}
                >
                  <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          {destination && (
            <div className="text-xs text-gray-500 font-mono">
              {formatCoordinates(destination)}
            </div>
          )}
        </div>
      </div>

      {/* Transport Modes */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2 sm:mb-3">{t('routeControls.transportModes.title')}</h3>
        <div className="grid grid-cols-2 gap-2">
          {TRANSPORT_MODES.map(({ id, label, icon: Icon, color }) => (
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
              <span className="text-xs sm:text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status and Clear Button */}
      <div className="space-y-2 sm:space-y-3">
        {isCalculating && (
          <div className="flex items-center justify-center p-2 sm:p-3 bg-blue-50 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-blue-700 font-medium">{t('routeControls.status.calculating')}</span>
          </div>
        )}

        {origin && destination && selectedModes.length === 0 && (
          <div className="flex items-center justify-center p-2 sm:p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <span className="text-sm text-yellow-700 font-medium">
              {t('routeControls.transportModes.selectMode')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
