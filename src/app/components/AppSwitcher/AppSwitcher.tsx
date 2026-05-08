import { useRef, useState, useEffect } from 'react';
import spellcastIcon from '../../../assets/spellcast-logo.svg';
import { NHEXA_API } from '../../../config/api';
import s from './AppSwitcher.module.css';

type App = { label: string; url: string; icon: string };

const isCurrent = (url: string) => {
  try { return new URL(url).origin === window.location.origin; } catch { return false; }
};

export const AppSwitcher = () => {
  const [open, setOpen] = useState(false);
  const [apps, setApps] = useState<App[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${NHEXA_API}/app-list`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setApps(data.user ?? []))
      .catch(() => {});
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
        <img src={spellcastIcon} alt="" className={s.triggerIcon} />
        <span className={s.name}>SPELLCAST</span>
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
