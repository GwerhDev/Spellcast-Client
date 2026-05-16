import { useRef, useState, useEffect } from 'react';
import spellcastIcon from '../../../assets/spellcast-logo.svg';
import s from './AppSwitcher.module.css';
import { App, getAppList } from '../../../services/apps';

const isCurrent = (url: string) => {
  try { return new URL(url).origin === window.location.origin; } catch { return false; }
};

export const AppSwitcher = () => {
  const [open, setOpen] = useState(false);
  const [apps, setApps] = useState<App[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAppList().then(setApps).catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className={s.root} ref={ref}>
      <button className={s.trigger} onClick={() => setOpen(o => !o)}>
        <span className={s.brandSpellcast}>
          <img src={spellcastIcon} alt="" className={s.triggerIcon} />
          <span className={s.name}>SPELLCAST</span>
        </span>
        <span className={s.brandNhexa}>
          <span className={s.nhexaIcon} />
          <span className={s.nhexaName}>NHEXA</span>
        </span>
      </button>

      {open && (
        <div className={s.popover}>
          {apps.length === 0 && (
            <span className={s.empty}>Loading…</span>
          )}
          {apps.filter(app => !isCurrent(app.url)).map(app => (
            <button
              key={app.url}
              className={s.item}
              onClick={() => { window.location.href = app.url; }}
            >
              <img src={app.icon} alt="" className={s.appIcon} />
              <span className={s.label}>{app.label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
