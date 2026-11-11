import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHexagonNodes } from '@fortawesome/free-solid-svg-icons';
import s from './AppSwitcher.module.css';

interface AppSwitcherProps {
  // What it's called for a screen reader (and its tooltip).
  label: string;
  onClick: () => void;
}

// Opens Nhexa's apps (the desktop): the apps icon (hexagon nodes), at the header's right, after
// the notifications' bell.
export const AppSwitcher = ({ label, onClick }: AppSwitcherProps) => (
  <button
    type="button"
    className={s.trigger}
    onClick={onClick}
    title={label}
    aria-label={label}
    data-testid="app-switcher-trigger"
  >
    <FontAwesomeIcon icon={faHexagonNodes} data-testid="app-switcher-apps-icon" />
  </button>
);
