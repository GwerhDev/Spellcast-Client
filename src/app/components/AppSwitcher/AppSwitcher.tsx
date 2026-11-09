import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHexagonNodes } from '@fortawesome/free-solid-svg-icons';
import spellcastIcon from '../../../assets/spellcast-logo.svg';
import s from './AppSwitcher.module.css';

interface AppSwitcherProps {
  // What it's called for a screen reader (and its tooltip).
  label: string;
  onClick: () => void;
}

// The header's top-left icon: opens Nhexa's apps (the desktop). Spellcast's own icon, which
// turns into the apps icon (hexagon nodes) on hover.
export const AppSwitcher = ({ label, onClick }: AppSwitcherProps) => (
  <button
    type="button"
    className={s.trigger}
    onClick={onClick}
    title={label}
    aria-label={label}
    data-testid="app-switcher-trigger"
  >
    <span className={s.iconBox}>
      <span className={s.icons}>
        <img src={spellcastIcon} alt="" className={s.appIcon} data-testid="app-switcher-app-icon" />
        <FontAwesomeIcon icon={faHexagonNodes} className={s.appsIcon} data-testid="app-switcher-apps-icon" />
      </span>
    </span>
  </button>
);
