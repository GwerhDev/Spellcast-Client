import s from './UserStats.module.css';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faShare, faChevronRight } from '@fortawesome/free-solid-svg-icons';

export const UserStats = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className={s.statsContainer}>
      <button className={s.card} onClick={() => navigate('/user/dashboard/groups')}>
        <div className={s.cardHeader}>
          <span className={s.cardIcon}><FontAwesomeIcon icon={faUsers} /></span>
          <span className={s.cardTitle}>{t.nav.groups}</span>
          <FontAwesomeIcon icon={faChevronRight} className={s.chevron} />
        </div>
        <div className={s.detailGrid}>
          <div className={s.detailCard}>
            <span className={s.detailValue}>0</span>
            <span className={s.detailLabel}>{t.nav.groups}</span>
          </div>
          <div className={s.detailCard}>
            <span className={s.detailValue}>0</span>
            <span className={s.detailLabel}>{t.groups.members}</span>
          </div>
          <div className={s.detailCard}>
            <span className={s.detailValue}>0</span>
            <span className={s.detailLabel}>{t.groups.activity}</span>
          </div>
        </div>
      </button>

      <button className={s.card} onClick={() => navigate('/user/dashboard/shared')}>
        <div className={s.cardHeader}>
          <span className={s.cardIcon}><FontAwesomeIcon icon={faShare} /></span>
          <span className={s.cardTitle}>{t.nav.shared}</span>
          <FontAwesomeIcon icon={faChevronRight} className={s.chevron} />
        </div>
        <div className={s.detailGrid}>
          <div className={s.detailCard}>
            <span className={s.detailValue}>0</span>
            <span className={s.detailLabel}>{t.shared.public}</span>
          </div>
          <div className={s.detailCard}>
            <span className={s.detailValue}>0</span>
            <span className={s.detailLabel}>{t.shared.inGroups}</span>
          </div>
        </div>
      </button>
    </div>
  );
};
