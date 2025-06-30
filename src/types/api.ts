/*
 * API types for router demo
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

export interface ApiRequest {
  id: string;
  method: string;
  url: string;
  status: 'pending' | 'success' | 'error';
  timestamp: Date;
  duration?: number;
  requestData?: Record<string, unknown>;
  responseData?: Record<string, unknown>;
  error?: string;
}
