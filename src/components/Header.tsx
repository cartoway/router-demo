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
import { LanguageSelector } from './LanguageSelector';
import { useTranslation } from '../contexts/TranslationContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBug } from '@fortawesome/free-solid-svg-icons';

interface HeaderProps {
  isDevMode: boolean;
  onToggleDevMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isDevMode, onToggleDevMode }) => {
  const { t } = useTranslation();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <img src="/favico.svg" alt="Logo" className="h-8 w-auto lg:hidden" />
            <img src="/logo.svg" alt="Logo" className="h-8 w-auto hidden lg:block" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('app.title')}</h1>
              <p className="text-sm text-gray-500">{t('app.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500 hidden lg:block">
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
            <LanguageSelector />
            <div className="hidden lg:flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <FontAwesomeIcon icon={faBug} className={`h-4 w-4 ${isDevMode ? 'text-red-600' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${isDevMode ? 'text-red-700' : 'text-gray-500'}`}>
                  Dev
                </span>
              </div>
              <button
                onClick={onToggleDevMode}
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
      </div>
    </header>
  );
};
