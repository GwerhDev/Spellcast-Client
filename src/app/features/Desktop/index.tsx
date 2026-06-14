import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import s from './Desktop.module.css';
import { App, EnvCategory, getNhexaEnv } from 'services/apps';
import { useAppSelector, useAppDispatch } from 'store/hooks';
import { setMinimized } from 'store/desktopSlice';

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
  const [categories, setCategories] = useState<EnvCategory[]>([]);

  useEffect(() => {
    getNhexaEnv().then(setCategories).catch(() => {});
  }, []);

  const allApps = categories.flatMap(c => c.apps);
  const currentApp = allApps.find((a) => sameHost(a.url)) ?? allApps.find(looksLikeSpellcast);

  const handleClick = (app: App) => {
    if (app === currentApp) {
      dispatch(setMinimized(false));
    } else {
      window.location.href = app.url;
    }
  };

  return (
    <>
      <div className={s.desktop} data-minimized={minimized} aria-hidden={!minimized} />
      <div className={s.launcherWrapper}>
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
            {categories.length === 0
              ? Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className={s.skeletonItem}>
                    <div className={s.skeletonIcon} />
                    <div className={s.skeletonLabel} />
                    <div className={s.skeletonDesc} />
                  </div>
                ))
              : categories.map((cat, i) => (
                  <React.Fragment key={cat.id}>
                    {i > 0 && <div className={s.categoryDivider} />}
                    <div className={s.category}>
                      <span className={s.categoryLabel}>{cat.name}</span>
                      <div className={s.categoryApps}>
                        {cat.apps.map(app => {
                          const current = app === currentApp;
                          return (
                            <button
                              key={app.url}
                              type="button"
                              className={`${s.item} ${current ? s.current : ''}`}
                              style={{ '--app-color': '#73a5cc' } as React.CSSProperties}
                              onClick={() => handleClick(app)}
                              data-testid={current ? 'desktop-app-current' : 'desktop-app-other'}
                            >
                              <img src={app.icon} alt="" className={s.appIcon} />
                              <span className={s.label}>{app.label.toUpperCase()}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </>
  );
};
