import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../contexts/TranslationContext';

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

type LangCode = 'fr' | 'en';

export const LanguageSelector: React.FC = () => {
  const { locale, changeLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fermer le menu si clic en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const current = LANGUAGES.find(l => l.code === locale) ?? LANGUAGES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center px-2 py-1 rounded text-sm font-medium transition-colors bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-lg mr-1">{current.flag}</span>
        <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <ul className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded shadow-lg z-10" role="listbox">
          {LANGUAGES.map(lang => (
            <li key={lang.code}>
              <button
                className={`flex items-center w-full px-3 py-2 text-sm hover:bg-blue-50 ${locale === lang.code ? 'font-bold text-blue-700' : 'text-gray-700'}`}
                onClick={() => { changeLocale(lang.code as LangCode); setOpen(false); }}
                role="option"
                aria-selected={locale === lang.code}
              >
                <span className="text-lg mr-2">{lang.flag}</span>
                {lang.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
