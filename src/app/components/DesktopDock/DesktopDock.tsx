import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faHouse, faUser } from '@fortawesome/free-solid-svg-icons';
import s from './DesktopDock.module.css';
import { useLanguage } from '../../../i18n';
import { EXTERNAL_LINKS } from '../../../config/externalLinks';

// The desktop's fixed tools, there whatever StreamBy's catalog says: Nhexa's home, the account,
// and the settings (not available yet).
export const DesktopDock = () => {
  const { t } = useLanguage();
  const go = (url: string) => () => { window.location.href = url; };

  return (
    <nav className={s.dock} data-testid="desktop-dock">
      <button type="button" className={s.tool} title={t.desktop.home} aria-label={t.desktop.home} onClick={go(EXTERNAL_LINKS.nhexaInterface)} data-testid="dock-home">
        <FontAwesomeIcon icon={faHouse} />
      </button>
      <button type="button" className={s.tool} title={t.desktop.account} aria-label={t.desktop.account} onClick={go(EXTERNAL_LINKS.accountsCenter)} data-testid="dock-account">
        <FontAwesomeIcon icon={faUser} />
      </button>
      <span className={s.separator} />
      <button type="button" className={s.tool} title={t.desktop.settingsSoon} aria-label={t.desktop.settingsSoon} disabled data-testid="dock-settings">
        <FontAwesomeIcon icon={faGear} />
      </button>
    </nav>
  );
};
