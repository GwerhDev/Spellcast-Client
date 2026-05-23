import { useRef, useState, useEffect } from 'react';
import { useAppSelector } from '../../../store/hooks';
import { useLanguage } from '../../../i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt, faTrophy, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import nhexaLogo from '../../components/AccountMenu/../../../assets/nhexa-logo.svg';
import { EXTERNAL_LINKS } from '../../../config/externalLinks';
import s from '../../components/AccountMenu/AccountMenu.module.css';

const XP_CAP = 500;
const userXP = 0;
const userLevel = 1;
const userAchievements = 0;
const xpPct = Math.min(Math.round(userXP / XP_CAP * 100), 100);

export const AccountMenu = () => {
  const userData = useAppSelector(state => state.session.userData);
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div data-testid="account-menu" className={s.root} ref={ref}>
      <button className={s.trigger} onClick={() => setOpen(o => !o)}>
        {userData.profilePic
          ? <img src={userData.profilePic} alt="" className={s.avatar}/>
          : <span className={s.initials}>{(userData.username ?? 'U')[0].toUpperCase()}</span>
        }
      </button>

      {open && (
        <div className={s.popover}>
          <div className={s.profile}>
            {userData.profilePic
              ? <img src={userData.profilePic} alt="" className={s.profilePic}/>
              : <span className={s.profileInitials}>{(userData.username ?? 'U')[0].toUpperCase()}</span>
            }
            <span className={s.username}>{userData.username ?? 'User'}</span>

            <div className={s.gamification}>
              <div className={s.rankRow}>
                <span className={s.rankBadge}><FontAwesomeIcon icon={faBolt} /> {t.gamification.rank}</span>
                <span className={s.levelLabel}>{t.gamification.level} {userLevel}</span>
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
          </div>

          <div className={s.divider}/>

          <a
            className={s.menuItem}
            href={EXTERNAL_LINKS.accountsCenter}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
          >
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            {t.nav.accountsCenter}
          </a>
          <a
            className={s.menuItem}
            href={EXTERNAL_LINKS.nhexaInterface}
            onClick={() => setOpen(false)}
          >
            <span className={s.nhexaIcon} style={{ maskImage: `url(${nhexaLogo})`, WebkitMaskImage: `url(${nhexaLogo})` }} />
            {t.nav.nhexaInterface}
          </a>
        </div>
      )}
    </div>
  );
};
