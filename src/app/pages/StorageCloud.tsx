import React from 'react';
import s from '../components/BrowserStorage/BrowserStorage.module.css';
import p from './UserPage.module.css';
import { PageTransition } from '../components/PageTransition';
import { useLanguage } from '../../i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloud } from '@fortawesome/free-solid-svg-icons';

export const StorageCloud = () => {
  const { t } = useLanguage();

  const detailItems = [
    { label: t.storage.documents,    value: 0 },
    { label: t.storage.audioCache,   value: 0 },
    { label: t.storage.voiceProfile, value: 0 },
    { label: t.storage.appSettings,  value: 0 },
  ];

  return (
    <PageTransition className="dashboard-sections">
      <div className={p.page}>
        <div className={p.content}>
          <div className={p.header}>
            <h1 className="featured">{t.nav.cloud}</h1>
            <p>{t.storage.cloudSubtitle}</p>
          </div>

          <div className={s.container}>
            <div className={s.overview}>
              <div className={s.ring} style={{ '--pct': '0%' } as React.CSSProperties}>
                <div className={s.ringInner}>
                  <FontAwesomeIcon icon={faCloud} style={{ color: 'var(--color-light-400)', fontSize: 20 }} />
                </div>
              </div>
              <div className={s.overviewStats}>
                <div className={s.stat}>
                  <span className={s.statLabel}>{t.storage.used}</span>
                  <span className={s.statValue}>0 B</span>
                </div>
                <div className={s.stat}>
                  <span className={s.statLabel}>{t.storage.available}</span>
                  <span className={s.statValue}>—</span>
                </div>
                <div className={s.stat}>
                  <span className={s.statLabel}>{t.storage.total}</span>
                  <span className={s.statValue}>—</span>
                </div>
              </div>
            </div>

            <p className={s.unsupported} style={{ padding: 0 }}>{t.storage.cloudSyncDesc}</p>

            <div className={s.divider} />

            <h3 className={s.sectionTitle}>{t.storage.storedContent}</h3>

            <div className={s.detailGrid}>
              {detailItems.map((item, i) => (
                <div key={i} className={s.detailCard}>
                  <span className={s.detailValue}>{item.value}</span>
                  <span className={s.detailLabel}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
