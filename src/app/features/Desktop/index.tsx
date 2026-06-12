import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import s from './Desktop.module.css';
import { App, getAppList } from 'services/apps';
import { useAppSelector, useAppDispatch } from 'store/hooks';
import { setMinimized } from 'store/desktopSlice';

const APP_COLORS: Record<string, string> = {
  spectra:   '#9b59b6',
  spellcast: '#5086b0',
  streamby:  '#2ecc71',
  nhexa:     '#73a5cc',
};

function colorFor(label: string): string {
  const key = label.toLowerCase();
  for (const [name, color] of Object.entries(APP_COLORS)) {
    if (key.includes(name)) return color;
  }
  return '#73a5cc';
}

/** True when the app URL points to the same host as the current window. */
const sameHost = (url: string): boolean => {
  try {
    return new URL(url).host === window.location.host;
  } catch {
    return false;
  }
};

const looksLikeSpellcast = (app: App): boolean =>
  /spellcast/i.test(app.url) || /spellcast/i.test(app.label);

export const Desktop = () => {
  const minimized = useAppSelector((st) => st.desktop.minimized);
  const dispatch = useAppDispatch();
  const [apps, setApps] = useState<App[]>([]);

  useEffect(() => {
    getAppList().then(setApps).catch(() => {});
  }, []);

  // Current app: prefer a host match (prod), fall back to a "spellcast" match (dev).
  const currentApp = apps.find((a) => sameHost(a.url)) ?? apps.find(looksLikeSpellcast);

  const handleClick = (app: App) => {
    if (app === currentApp) {
      dispatch(setMinimized(false)); // restore: back to what you were doing
    } else {
      window.location.href = app.url; // redirect to the other app
    }
  };

  return (
    <div className={s.desktop} data-minimized={minimized} aria-hidden={!minimized}>
      <AnimatePresence>
        {minimized && (
          <motion.div
            className={s.launcher}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
            data-testid="desktop-launcher"
          >
            {apps.length === 0
              ? Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className={s.skeletonItem}>
                    <div className={s.skeletonIcon} />
                    <div className={s.skeletonLabel} />
                    <div className={s.skeletonDesc} />
                  </div>
                ))
              : apps.map((app) => {
                  const current = app === currentApp;
                  return (
                    <button
                      key={app.url}
                      type="button"
                      className={`${s.item} ${current ? s.current : ''}`}
                      style={{ '--app-color': colorFor(app.label) } as React.CSSProperties}
                      onClick={() => handleClick(app)}
                      data-testid={current ? 'desktop-app-current' : 'desktop-app-other'}
                    >
                      <img src={app.icon} alt="" className={s.appIcon} />
                      <span className={s.label}>{app.label.toUpperCase()}</span>
                    </button>
                  );
                })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
