import s from './UserStats.module.css';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../i18n';

export const UserStats = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className={s.statsContainer}>
      <div className={`${s.statCard} ${s.clickable}`} onClick={() => navigate(`/user/dashboard/groups`)}>
        <h4>{t.nav.groups}</h4>
      </div>
      <div className={`${s.statCard} ${s.clickable}`} onClick={() => navigate(`/user/dashboard/shared`)}>
        <h4>{t.nav.shared}</h4>
        <p></p>
      </div>
    </div>
  );
};
