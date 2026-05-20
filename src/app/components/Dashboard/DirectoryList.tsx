import s from './DirectoryList.module.css';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { settingsDirectoryList } from '../../../config/consts';
import { useLanguage } from '../../../i18n';

export const DirectoryList = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const descriptions: Record<string, string> = {
    'settings/credentials': t.credentials.subtitle,
    'settings/permissions': t.permissions.subtitle,
    'settings/appearance':  t.appearance.subtitle,
  };

  const names: Record<string, string> = {
    'settings/credentials': t.nav.credentials,
    'settings/permissions': t.nav.permissions,
    'settings/appearance':  t.nav.appearance,
  };

  return (
    <div className={s.container}>
      <ul className={s.list}>
        {settingsDirectoryList.map(({ icon, path }) => (
          <li key={path}>
            <button className={s.card} onClick={() => navigate(`/user/${path}`)}>
              <span className={s.iconWrap}>
                <FontAwesomeIcon icon={icon} className={s.icon} />
              </span>
              <span className={s.text}>
                <span className={s.cardTitle}>{names[path]}</span>
                <span className={s.cardDesc}>{descriptions[path]}</span>
              </span>
              <FontAwesomeIcon icon={faChevronRight} className={s.chevron} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
