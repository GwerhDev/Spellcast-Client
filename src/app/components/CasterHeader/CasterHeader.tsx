import s from './CasterHeader.module.css';
import sk from '../Loader/Skeleton.module.css';
import { useLanguage } from '../../../i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt, faTrophy } from '@fortawesome/free-solid-svg-icons';

const XP_CAP = 500;
const userXP = 0;
const userLevel = 1;
const userAchievements = 0;

interface CasterHeaderProps {
  username?: string;
  profilePic?: string;
  loader?: boolean;
}

// Ported from the former UserPresentation/Overview dashboard header (TCORE-107 follow-up:
// Dashboard dissolves into a "Stats" tab inside the Caster profile page, but its header --
// avatar, username, XP/level/achievements -- moves onto the profile itself, which is now
// the default landing for "Caster"). Presentational only: no store access here, the caller
// (CasterProfileLanding) reads session state and passes it down.
export const CasterHeader = ({ username, profilePic, loader }: CasterHeaderProps) => {
  const { t } = useLanguage();
  const xpPct = Math.min((userXP / XP_CAP) * 100, 100);

  return (
    <div data-testid="caster-header" className={s.header}>
      <ul>
        <li className={`${s.imgContainer} ${loader ? s.borderAnimate : ''}`}>
          <span className={`${s.imageContainer} ${loader ? sk.skeleton : ''}`}>
            {!loader && (
              profilePic
                ? <img data-testid="caster-header-avatar-image" src={profilePic} alt={username} className={s.image} />
                : <span data-testid="caster-header-avatar-initial">{username?.[0]}</span>
            )}
          </span>
        </li>
      </ul>

      <ul className={s.details}>
        <li className={`${s.title} ${loader ? sk.skeleton : ''}`}>
          {!loader && <h1 data-testid="caster-header-username" className="featured-glow">{username}</h1>}
        </li>

        <li className={`${loader ? sk.skeleton : ''}`}>
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

              <div data-testid="caster-header-xp" className={s.xpFooter}>
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
  );
};
