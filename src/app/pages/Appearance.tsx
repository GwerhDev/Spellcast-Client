import { useTheme } from '../../context/ThemeContext';
import styles from './Appearance.module.css';

const LightThemeIcon = () => (
  <svg width="100" height="70" viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="70" rx="8" fill="#F5F5F5"/>
    <rect x="10" y="10" width="80" height="8" rx="4" fill="#E0E0E0"/>
    <rect x="10" y="22" width="60" height="8" rx="4" fill="#BDBDBD"/>
    <rect x="10" y="34" width="80" height="26" rx="4" fill="#E0E0E0"/>
  </svg>
);

const DarkThemeIcon = () => (
  <svg width="100" height="70" viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="70" rx="8" fill="#1A1A1C"/>
    <rect x="10" y="10" width="80" height="8" rx="4" fill="#2F2F2F"/>
    <rect x="10" y="22" width="60" height="8" rx="4" fill="#464646"/>
    <rect x="10" y="34" width="80" height="26" rx="4" fill="#2F2F2F"/>
  </svg>
);

const SystemThemeIcon = () => (
    <svg width="100" height="70" viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 8C0 3.58172 3.58172 0 8 0H50V70H8C3.58172 70 0 66.4183 0 62V8Z" fill="#F5F5F5"/>
        <path d="M50 0H92C96.4183 0 100 3.58172 100 8V62C100 66.4183 96.4183 70 92 70H50V0Z" fill="#1A1A1C"/>
        <rect x="10" y="10" width="80" height="8" rx="4" fill="#E0E0E0"/>
        <rect x="10" y="22" width="60" height="8" rx="4" fill="#BDBDBD"/>
        <rect x="10" y="34" width="80" height="26" rx="4" fill="#E0E0E0"/>
        <rect x="10" y="10" width="80" height="8" rx="4" fill="#2F2F2F"/>
        <rect x="10" y="22" width="60" height="8" rx="4" fill="#464646"/>
        <rect x="10" y="34" width="80" height="26" rx="4" fill="#2F2F2F"/>
    </svg>
);


export const Appearance = () => {
  const { theme, setTheme } = useTheme();

  const themes = [
    { name: 'Light', icon: <LightThemeIcon /> },
    { name: 'Dark', icon: <DarkThemeIcon /> },
    { name: 'System', icon: <SystemThemeIcon /> },
  ];

  return (
    <div>
      <h2 className={styles.title}>Appearance</h2>
      <p className={styles.subtitle}>Select a theme for the application.</p>
      <div className={styles.themeGrid}>
        {themes.map(({ name, icon }) => {
          const themeValue = name.toLowerCase() as 'light' | 'dark' | 'system';
          const isActive = theme === themeValue;
          return (
            <div
              key={name}
              className={`${styles.themeBox} ${isActive ? styles.active : ''}`}
              onClick={() => setTheme(themeValue)}
            >
              {icon}
              <span className={styles.themeName}>{name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
