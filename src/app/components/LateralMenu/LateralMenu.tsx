import s from './LateralMenu.module.css';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faGear, faTableColumns } from '@fortawesome/free-solid-svg-icons';
import { dashboardDirectoryList, settingsDirectoryList, storageDirectoryList } from '../../../config/consts';
import { useLanguage } from '../../../i18n';

type NavKey = 'groups' | 'shared' | 'local' | 'cloud' | 'credentials' | 'permissions' | 'appearance';

interface LateralMenuProps {
  onNavigate?: () => void;
}

export const LateralMenu = ({ onNavigate }: LateralMenuProps) => {
  const { t } = useLanguage();
  const isMobile = window.matchMedia('(max-width: 1024px)').matches;

  const navName: Record<NavKey, string> = {
    groups: t.nav.groups,
    shared: t.nav.shared,
    local: t.nav.local,
    cloud: t.nav.cloud,
    credentials: t.nav.credentials,
    permissions: t.nav.permissions,
    appearance: t.nav.appearance,
  };

  const getName = (path: string, fallback: string): string => {
    const key = path.split('/').pop() as NavKey;
    return navName[key] ?? fallback;
  };

  const wrapperAnim = isMobile
    ? { initial: { height: 0 }, animate: { height: 'auto' }, exit: { height: 0 } }
    : { initial: { width: 0 }, animate: { width: 'auto' }, exit: { width: 0 } };

  return (
    <motion.div
      className={s.wrapper}
      {...wrapperAnim}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
    >
    <motion.div
      className={s.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      onClick={onNavigate}
    >
      <div className={s.outterMenuContainer}>
        <div className={s.menuContainer}>
          <div className={s.mainMenu}>
            <h5>{t.nav.mainMenu}</h5>
            <span className={`${s.section} ${location.pathname.startsWith(`/user/dashboard`) ? s.activeLink : ''}`}>
              <Link to={`/user/dashboard`}>
                <h4>{t.nav.dashboard}</h4>
              </Link>
              <FontAwesomeIcon icon={faTableColumns} />
            </span>
          </div>

          <ul className={s.menuList}>
            {dashboardDirectoryList.map(({ name, icon, path }, index) => {
              const linkPath = `/user/${path}`;
              const isActive = location.pathname === linkPath || location.pathname.startsWith(`${linkPath}/`);
              return (
                <Link key={index} to={linkPath}>
                  <li className={isActive ? s.activeLink : ''}>
                    {icon && <FontAwesomeIcon icon={icon} />}
                    {getName(path, name)}
                  </li>
                </Link>
              );
            })}
          </ul>

          <span className={s.section}>
            <Link to={`/user/storage`}>
              <h4>{t.nav.storage}</h4>
            </Link>
            <FontAwesomeIcon icon={faBox} />
          </span>
          <ul className={s.menuList}>
            {storageDirectoryList.map(({ name, icon, path }, index) => {
              const linkPath = `/user/${path}`;
              const isActive = location.pathname === linkPath || location.pathname.startsWith(`${linkPath}/`);
              return (
                <Link key={index} to={linkPath}>
                  <li className={isActive ? s.activeLink : ''}>
                    {icon && <FontAwesomeIcon icon={icon} />}
                    {getName(path, name)}
                  </li>
                </Link>
              );
            })}
          </ul>

          <span className={`${s.section} ${location.pathname.startsWith(`/user/settings`) ? s.activeLink : ''}`}>
            <Link to={`/user/settings`}>
              <h4>{t.nav.settings}</h4>
            </Link>
            <FontAwesomeIcon icon={faGear} />
          </span>
          <ul className={s.menuList}>
            {settingsDirectoryList.map(({ name, icon, path }, index) => {
              const linkPath = `/user/${path}`;
              const isActive = location.pathname === linkPath || location.pathname.startsWith(`${linkPath}/`);
              return (
                <Link key={index} to={linkPath}>
                  <li className={isActive ? s.activeLink : ''}>
                    {icon && <FontAwesomeIcon icon={icon} />}
                    {getName(path, name)}
                  </li>
                </Link>
              );
            })}
          </ul>
        </div>
      </div>
    </motion.div>
    </motion.div>
  );
};
