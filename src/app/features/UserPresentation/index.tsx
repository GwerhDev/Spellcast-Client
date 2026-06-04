import s from '../../components/UserPresentation/UserPresentation.module.css';
import skeleton from '../../components/Loader/Skeleton.module.css';
import { useSelector } from 'react-redux';
import { UserStats } from '../../components/UserStats/UserStats';
import { LibraryCharts } from '../../components/LibraryCharts/LibraryCharts';
import { StorageOverview } from '../../components/StorageOverview/StorageOverview';
import { userData } from '../../../interfaces';
import { RootState } from '../../../store';
import { useLanguage } from '../../../i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt, faTrophy } from '@fortawesome/free-solid-svg-icons';

const XP_CAP = 500;
const userXP = 0;
const userLevel = 1;
const userAchievements = 0;

export const UserPresentation = () => {
  const { t } = useLanguage();
  const userDataVal: userData = useSelector((state: RootState) => state.session.userData);
  const { loader, profilePic, username } = userDataVal || {};

  const xpPct = Math.min((userXP / XP_CAP) * 100, 100);

  return (
    <div data-testid="user-presentation" className={s.container}>
      <div className={s.header}>
        <ul>
          <li className={`${s.imgContainer} ${loader ? s.borderAnimate : ''}`}>
            <span className={`${s.imageContainer} ${loader ? skeleton.skeleton : ''}`}>
              {!loader && (
                profilePic
                  ? <img src={profilePic} alt="User image" className={s.image} />
                  : <span>{username?.[0]}</span>
              )}
            </span>
          </li>
        </ul>

        <ul className={s.details}>
          <li className={`${s.title} ${loader ? skeleton.skeleton : ''}`}>
            {!loader && <h1 className="featured-glow">{username}</h1>}
          </li>

          <li className={`${loader ? skeleton.skeleton : ''}`}>
            {!loader && (
              <div className={s.xpSection}>
                <div className={s.rankRow}>
                  <span className={s.rankBadge}>
                    <FontAwesomeIcon icon={faBolt} />
                    {t.gamification.rank}
                  </span>
                  <span className={s.levelLabel}>
                    {t.gamification.level} {userLevel}
                  </span>
                </div>

                <div className={s.xpBarTrack}>
                  <div className={s.xpBarFill} style={{ width: `${xpPct}%` }} />
                </div>

                <div className={s.xpFooter}>
                  <span>{userXP} / {XP_CAP} {t.gamification.xp}</span>
                  <span className={s.xpDot}>·</span>
                  <FontAwesomeIcon icon={faTrophy} />
                  <span>{userAchievements} {t.gamification.achievements}</span>
                </div>
              </div>
            )}
          </li>
        </ul>
      </div>

      <div className={s.stats}>
        <LibraryCharts />
        <UserStats />
        <StorageOverview />
      </div>
    </div>
  );
};
