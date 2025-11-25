/*
 * API Requests Panel (Dev mode)
 * Reusable component to display logged HTTP requests
 */

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBug, faDownload, faTrash, faCopy } from '@fortawesome/free-solid-svg-icons';
import type { ApiRequest } from '../types/api';

interface ApiRequestsPanelProps {
  isDevMode?: boolean;
  apiRequests?: ApiRequest[];
  onClearApiRequests?: () => void;
  onExportApiRequests?: () => void;
}

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

const formatApiDuration = (ms?: number) => {
  if (!ms && ms !== 0) return undefined;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatApiTimestamp = (date: Date) => {
  try { return new Date(date).toLocaleTimeString(); } catch { return String(date); }
};

const hasDataInUrl = (url: string) => url.includes('?') || url.includes('&');

export const ApiRequestsPanel: React.FC<ApiRequestsPanelProps> = ({
  isDevMode = false,
  apiRequests = [],
  onClearApiRequests,
  onExportApiRequests,
}) => {
  if (!isDevMode) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
        <div className="flex items-center space-x-2">
          <FontAwesomeIcon icon={faBug} className="h-5 w-5 text-red-600" />
          <h3 className="text-lg font-semibold text-gray-900">API Requests</h3>
          <span className="text-sm text-gray-500">({apiRequests.length})</span>
        </div>
        <div className="flex items-center flex-wrap gap-2 w-full justify-end mt-2 sm:mt-0 sm:w-auto">
          <button
            onClick={onExportApiRequests}
            className="shrink-0 whitespace-nowrap flex items-center space-x-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            title="Export requests as JSON"
          >
            <FontAwesomeIcon icon={faDownload} className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={onClearApiRequests}
            className="shrink-0 whitespace-nowrap flex items-center space-x-2 px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
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
            <p className="text-sm">Make a route calculation or geocoding search to see requests here.</p>
          </div>
        ) : (
          apiRequests.map((request) => (
            <div key={request.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
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
                  {typeof request.duration === 'number' && (
                    <span className="text-sm text-gray-500">{formatApiDuration(request.duration)}</span>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(`curl -X ${request.method.toUpperCase()} "${request.url}" -H "Accept: application/json"`)}
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
                  <span className="truncate block max-w-full" title={request.url}>
                    {request.url}
                  </span>
                </div>
              </div>

              {/* Show request data only if not in URL and method is not GET */}
              {request.requestData && request.method.toUpperCase() !== 'GET' && !hasDataInUrl(request.url) && (
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
  );
};

export default ApiRequestsPanel;
