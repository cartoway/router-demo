import React from 'react';
import { BASE_MAP_OPTIONS } from '../config/baseMaps';
import { useTranslation } from '../contexts/TranslationContext';

interface BaseMapSelectorProps {
  value: string;
  onChange: (url: string) => void;
}

export const BaseMapSelector: React.FC<BaseMapSelectorProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="text-xs font-semibold text-gray-700">{t('map.baseMap.title')}</div>
      <div className="space-y-1">
        {BASE_MAP_OPTIONS.map((opt) => (
          <label key={opt.id} className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="radio"
              name="base-map"
              value={opt.url}
              checked={value === opt.url}
              onChange={() => onChange(opt.url)}
              className="h-3.5 w-3.5 rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-700">{t(opt.labelKey)}</span>
          </label>
        ))}
      </div>
    </div>
  );
};
