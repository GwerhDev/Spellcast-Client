import { useTheme } from '../../../../context/ThemeContext';
import { IconButton } from '../IconButton';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
import styles from './ThemeSwitcher.module.css';

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  return (
    <div className={styles.themeSwitcherWrapper}>
        <p className={styles.themeSwitcherText}>Cambiar a modo {theme === 'light' ? 'oscuro' : 'claro'}</p>
        <IconButton
            onClick={toggleTheme}
            icon={theme === 'light' ? faMoon : faSun}
            variant="transparent"
        />
    </div>
  );
};
