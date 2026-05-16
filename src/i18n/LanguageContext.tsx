import { createContext, useContext, useState, useCallback } from 'react';
import type { Language, Translations } from './types';
import { en } from './locales/en';
import { es } from './locales/es';

const locales: Record<Language, Translations> = { en, es };

const STORAGE_KEY = 'spellcast-lang';

const getInitialLanguage = (): Language => {
  const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
  if (stored && stored in locales) return stored;
  const browser = navigator.language.slice(0, 2) as Language;
  return browser in locales ? browser : 'en';
};

interface LanguageContextValue {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLang] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem(STORAGE_KEY, lang);
    setLang(lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, t: locales[language], setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
};
