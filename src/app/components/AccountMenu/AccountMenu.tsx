import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from 'store/hooks';
import { fetchLogout } from 'src/services/auth';
import { useLanguage } from 'src/i18n';
import s from './AccountMenu.module.css';

export const AccountMenu = () => {
  const userData = useAppSelector(state => state.session.userData);
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    try {
      await fetchLogout();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className={s.root} ref={ref}>
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
          </div>
          <div className={s.divider}/>
          <button className={s.menuItem} onClick={() => { navigate('/user'); setOpen(false); }}>
            {t.nav.account}
          </button>
          <button className={`${s.menuItem} ${s.logout}`} onClick={handleLogout}>
            {t.auth.logout}
          </button>
        </div>
      )}
    </div>
  );
};
