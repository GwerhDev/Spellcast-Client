import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../i18n';
import s from './Themes.module.css';

const LightThemeIcon = () => (
  <svg width="100" height="70" viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="70" rx="8" fill="#F5F5F5" />
    <rect x="10" y="10" width="80" height="8" rx="4" fill="#E0E0E0" />
    <rect x="10" y="22" width="60" height="8" rx="4" fill="#BDBDBD" />
    <rect x="10" y="34" width="80" height="26" rx="4" fill="#E0E0E0" />
  </svg>
);

const DarkThemeIcon = () => (
  <svg width="100" height="70" viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="70" rx="8" fill="#1A1A1C" />
    <rect x="10" y="10" width="80" height="8" rx="4" fill="#2F2F2F" />
    <rect x="10" y="22" width="60" height="8" rx="4" fill="#464646" />
    <rect x="10" y="34" width="80" height="26" rx="4" fill="#2F2F2F" />
  </svg>
);

const SystemThemeIcon = () => (
  <svg width="100" height="70" viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 8C0 3.58172 3.58172 0 8 0H50V70H8C3.58172 70 0 66.4183 0 62V8Z" fill="#F5F5F5" />
    <path d="M50 0H92C96.4183 0 100 3.58172 100 8V62C100 66.4183 96.4183 70 92 70H50V0Z" fill="#1A1A1C" />
    <rect x="10" y="10" width="80" height="8" rx="4" fill="#E0E0E0" />
    <rect x="10" y="22" width="60" height="8" rx="4" fill="#BDBDBD" />
    <rect x="10" y="34" width="80" height="26" rx="4" fill="#E0E0E0" />
    <rect x="10" y="10" width="80" height="8" rx="4" fill="#2F2F2F" />
    <rect x="10" y="22" width="60" height="8" rx="4" fill="#464646" />
    <rect x="10" y="34" width="80" height="26" rx="4" fill="#2F2F2F" />
  </svg>
);

export const Themes = () => {
  const { theme, setTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();

  const themes = [
    { key: 'light' as const, label: t.appearance.light, icon: <LightThemeIcon /> },
    { key: 'dark' as const, label: t.appearance.dark, icon: <DarkThemeIcon /> },
    { key: 'system' as const, label: t.appearance.system, icon: <SystemThemeIcon /> },
  ];

  const languages = [
    { key: 'en' as const, label: t.appearance.english },
    { key: 'es' as const, label: t.appearance.spanish },
  ];

  return (
    <div className={s.container}>
      <h1 className="featured">{t.appearance.title}</h1>
      <p className={s.subtitle}>{t.appearance.themeSubtitle}</p>
      <div className={s.themesContainer}>
        <div className={s.themeGrid}>
          {themes.map(({ key, label, icon }) => (
            <div
              key={key}
              className={`${s.themeBox} ${theme === key ? s.active : ''}`}
              onClick={() => setTheme(key)}
            >
              {icon}
              <span className={s.themeName}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <p className={s.sectionTitle}>{t.appearance.languageTitle}</p>
      <p className={s.subtitle}>{t.appearance.languageSubtitle}</p>
      <div className={s.langGrid}>
        {languages.map(({ key, label }) => (
          <button
            key={key}
            className={`${s.langBox} ${language === key ? s.active : ''}`}
            onClick={() => setLanguage(key)}
          >
            <span className={s.themeName}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
