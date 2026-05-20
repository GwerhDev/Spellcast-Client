import React, { useEffect, useState } from 'react';
import s from './StorageOverview.module.css';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../i18n';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHardDrive, faCloud, faChevronRight } from '@fortawesome/free-solid-svg-icons';

interface StorageData {
  quota: number;
  usage: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const StorageOverview: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [data, setData] = useState<StorageData | null>(null);

  useEffect(() => {
    navigator.storage?.estimate().then((estimate) => {
      setData({ quota: estimate.quota ?? 0, usage: estimate.usage ?? 0 });
    });
  }, []);

  const usedPct = data && data.quota > 0 ? (data.usage / data.quota) * 100 : 0;

  return (
    <div className={s.container}>
      <div className={s.cards}>
        <button className={s.card} onClick={() => navigate('/user/storage/local')}>
          <div className={s.cardHeader}>
            <span className={s.cardIcon}>
              <FontAwesomeIcon icon={faHardDrive} />
            </span>
            <span className={s.cardTitle}>{t.nav.local}</span>
            <FontAwesomeIcon icon={faChevronRight} className={s.chevron} />
          </div>

          <div className={s.cardBody}>
            <div
              className={s.ring}
              style={{ '--pct': `${usedPct.toFixed(1)}%` } as React.CSSProperties}
            >
              <div className={s.ringInner}>
                <span className={s.ringPct}>{data ? `${usedPct.toFixed(0)}%` : '—'}</span>
              </div>
            </div>

            <div className={s.stats}>
              <div className={s.stat}>
                <span className={s.statLabel}>{t.storage.used}</span>
                <span className={s.statValue}>{data ? formatBytes(data.usage) : '—'}</span>
              </div>
              <div className={s.stat}>
                <span className={s.statLabel}>{t.storage.available}</span>
                <span className={s.statValue}>{data ? formatBytes(data.quota - data.usage) : '—'}</span>
              </div>
              <div className={s.stat}>
                <span className={s.statLabel}>{t.storage.total}</span>
                <span className={s.statValue}>{data ? formatBytes(data.quota) : '—'}</span>
              </div>
            </div>
          </div>
        </button>

        <button className={s.card} onClick={() => navigate('/user/storage/cloud')}>
          <div className={s.cardHeader}>
            <span className={s.cardIcon}>
              <FontAwesomeIcon icon={faCloud} />
            </span>
            <span className={s.cardTitle}>{t.nav.cloud}</span>
            <FontAwesomeIcon icon={faChevronRight} className={s.chevron} />
          </div>

          <div className={s.cardBody}>
            <div
              className={s.ring}
              style={{ '--pct': '0%' } as React.CSSProperties}
            >
              <div className={s.ringInner}>
                <span className={s.ringPct}>0%</span>
              </div>
            </div>

            <div className={s.stats}>
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
        </button>
      </div>
    </div>
  );
};
