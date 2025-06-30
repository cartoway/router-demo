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
  faEyeSlash,
  faDownload,
  faTrash,
  faBug,
  faCopy
} from '@fortawesome/free-solid-svg-icons';
import { RouteResult } from '../types/route';
import { getModeLabel } from '../config/transportModes';
import { useTranslation } from '../contexts/TranslationContext';
import { ApiRequest } from '../types/api';

interface RouteResultsProps {
  routes: RouteResult[];
  visibleRoutes: string[];
  onToggleRouteVisibility: (mode: string) => void;
  isDevMode?: boolean;
  apiRequests?: ApiRequest[];
  onClearApiRequests?: () => void;
  onExportApiRequests?: () => void;
}

export const RouteResults: React.FC<RouteResultsProps> = ({
  routes,
  visibleRoutes,
  onToggleRouteVisibility,
  isDevMode = false,
  apiRequests = [],
  onClearApiRequests,
  onExportApiRequests,
}) => {
  const { t } = useTranslation();

  if (routes.length === 0 && !isDevMode) {
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

  const formatApiDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatApiTimestamp = (date: Date) => {
    return date.toLocaleTimeString();
  };

  const getApiStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'success': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getApiStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const copyRequestToClipboard = (request: ApiRequest) => {
    // Create a cURL command that can be imported into Postman
    let curlCommand = `curl -X ${request.method.toUpperCase()} "${request.url}"`;

    // Add headers if needed
    curlCommand += ' -H "Content-Type: application/json"';

    // Add request data if it exists and method is not GET
    if (request.requestData && request.method.toUpperCase() !== 'GET') {
      curlCommand += ` -d '${JSON.stringify(request.requestData)}'`;
    }

    // Replace api_key with {{api_key}} for Postman variable
    curlCommand = curlCommand.replace(/api_key=([^&]+)/g, 'api_key={{api_key}}');

    // Copy to clipboard
    navigator.clipboard.writeText(curlCommand).then(() => {
      // You could add a toast notification here
      console.log('Request copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy request:', err);
    });
  };

  const hasDataInUrl = (url: string) => {
    return url.includes('?') || url.includes('&');
  };

  return (
    <div className="space-y-6">
      {/* Route Results */}
      {routes.length > 0 && (
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
                        {getModeLabel(route.mode, t)}
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

                  <div className="mt-2 flex flex-wrap gap-1">
                    {route.duration === Math.min(...routes.map(r => r.duration)) && (
                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {t('routeResults.fastest')}
                      </div>
                    )}
                    {route.distance === Math.min(...routes.map(r => r.distance)) && (
                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {t('routeResults.shortest')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* API Requests (Dev Mode) */}
      {isDevMode && (
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center space-x-2">
              <FontAwesomeIcon icon={faBug} className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">API Requests</h3>
              <span className="text-sm text-gray-500">({apiRequests.length})</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onExportApiRequests}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                title="Export requests as JSON"
              >
                <FontAwesomeIcon icon={faDownload} className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={onClearApiRequests}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                title="Clear all requests"
              >
                <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-auto">
            {apiRequests.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No API requests yet.</p>
                <p className="text-sm">Make a route calculation to see requests here.</p>
              </div>
            ) : (
              apiRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getApiStatusIcon(request.status)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getApiStatusColor(request.status)}`}>
                        {request.status.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatApiTimestamp(request.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {request.duration && (
                        <span className="text-sm text-gray-500">
                          {formatApiDuration(request.duration)}
                        </span>
                      )}
                      <button
                        onClick={() => copyRequestToClipboard(request)}
                        className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Copy request to clipboard (cURL format)"
                      >
                        <FontAwesomeIcon icon={faCopy} className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="text-sm font-medium text-gray-900">
                      <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs font-mono mr-2">
                        {request.method.toUpperCase()}
                      </span>
                      <span
                        className="truncate block max-w-full"
                        title={request.url}
                      >
                        {request.url}
                      </span>
                    </div>
                  </div>

                  {request.error && (
                    <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <strong>Error:</strong> {request.error}
                    </div>
                  )}

                  {/* Show request data only if not in URL and method is not GET */}
                  {request.requestData &&
                   request.method.toUpperCase() !== 'GET' &&
                   !hasDataInUrl(request.url) && (
                    <div className="mt-2">
                      <h4 className="font-medium text-gray-700 mb-1 text-sm">Request Data:</h4>
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-24">
                        {JSON.stringify(request.requestData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
