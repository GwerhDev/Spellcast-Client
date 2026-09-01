import React from 'react';
import { useNavigate } from 'react-router-dom';
import s from '../components/BrowserStorage/BrowserStorage.module.css';
import page from './UserPage.module.css';
import { PageTransition } from '../components/PageTransition';
import { IconButton } from '../components/Buttons/IconButton';
import { useLanguage } from '../../i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCloud } from '@fortawesome/free-solid-svg-icons';

// TCORE-107 follow-up: this page's own title/subtitle heading is dropped -- it's now
// redundant with CasterLayout's persistent tab bar, which every /caster/* route renders
// under (reached here via the "Storage" tab -> Cloud). Its own UserPage.module.css
// .page/.content wrapper is dropped too -- CasterLayout's .content already establishes the
// full-width-then-centered-1024 frame. A back button is added since this is a level deeper
// than what the tab bar itself represents (its "Storage" tab lands on /caster/storage, not
// here) -- without it there'd be no way back except the browser's own back button.
export const StorageCloud = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const detailItems = [
    { label: t.storage.spells,    value: 0 },
    { label: t.storage.audioCache,   value: 0 },
    { label: t.storage.voiceProfile, value: 0 },
    { label: t.storage.appSettings,  value: 0 },
  ];

  return (
    <PageTransition className="dashboard-sections">
      <div className={page.pageInfoContainer}>
        <IconButton icon={faArrowLeft} className={page.backButton} variant="transparent" title={t.common.back} onClick={() => navigate('/caster/storage')} />
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
    </PageTransition>
  );
};
