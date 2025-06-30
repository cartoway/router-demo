import React from 'react';
import { LanguageSelector } from './LanguageSelector';
import { useTranslation } from '../contexts/TranslationContext';

export const Header: React.FC = () => {
  const { t } = useTranslation();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <LanguageSelector />
            <div className="text-sm text-gray-500 hidden lg:block">
              {t('app.poweredBy')}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
