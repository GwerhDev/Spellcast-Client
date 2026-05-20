import React, { useEffect, useState } from 'react';
import s from './BrowserStorage.module.css';
import { useLanguage } from '../../../i18n';
import { DB_NAME, DB_VERSION, DOCUMENTS_STORE_NAME } from '../../../config/api';

interface StorageBreakdown {
  indexedDB?: number;
  caches?: number;
  serviceWorkerRegistrations?: number;
  [key: string]: number | undefined;
}

interface StorageData {
  quota: number;
  usage: number;
  breakdown: StorageBreakdown;
  localStorage: number;
}

interface ItemCounts {
  documents: number;
  audioPages: number;
  voiceProfiles: number;
}

interface SettingEntry {
  key: string;
  value: string;
}

const KNOWN_LS_KEYS = ['theme', 'spellcast-lang', 'editor:autoSave', 'reader:fitToWidth', 'reader:lightningMode'];

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getLocalStorageSize = (): number => {
  let size = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) ?? '';
    const val = localStorage.getItem(key) ?? '';
    size += (key.length + val.length) * 2;
  }
  return size;
};

const countIDBStore = (dbName: string, storeName: string): Promise<number> =>
  new Promise((resolve) => {
    const req = indexedDB.open(dbName);
    req.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) { db.close(); resolve(0); return; }
      const countReq = db.transaction(storeName, 'readonly').objectStore(storeName).count();
      countReq.onsuccess = () => { resolve(countReq.result); db.close(); };
      countReq.onerror = () => { resolve(0); db.close(); };
    };
    req.onerror = () => resolve(0);
  });

export const BrowserStorage: React.FC = () => {
  const { t } = useLanguage();
  const [data, setData] = useState<StorageData | null>(null);
  const [supported, setSupported] = useState(true);
  const [counts, setCounts] = useState<ItemCounts | null>(null);
  const [settings, setSettings] = useState<SettingEntry[]>([]);

  useEffect(() => {
    if (!navigator.storage?.estimate) { setSupported(false); return; }
    navigator.storage.estimate().then((estimate) => {
      setData({
        quota: estimate.quota ?? 0,
        usage: estimate.usage ?? 0,
        breakdown: (estimate as { usageDetails?: StorageBreakdown }).usageDetails ?? {},
        localStorage: getLocalStorageSize(),
      });
    });

    Promise.all([
      countIDBStore(DB_NAME, DOCUMENTS_STORE_NAME),
      countIDBStore('spellcast-audio-cache', 'audio_pages'),
      countIDBStore('spellcast-preferences', 'user_voice'),
    ]).then(([documents, audioPages, voiceProfiles]) => {
      setCounts({ documents, audioPages, voiceProfiles });
    }).catch(() => setCounts({ documents: 0, audioPages: 0, voiceProfiles: 0 }));

    setSettings(
      KNOWN_LS_KEYS
        .map((key) => ({ key, value: localStorage.getItem(key) ?? '' }))
        .filter((e) => e.value !== '')
    );
  }, []);

  if (!supported) return <p className={s.unsupported}>{t.storage.notSupported}</p>;
  if (!data)       return <p className={s.loading}>{t.storage.calculating}</p>;

  const usedPct = data.quota > 0 ? (data.usage / data.quota) * 100 : 0;

  const breakdownItems = [
    { label: t.storage.indexedDB,    value: data.breakdown.indexedDB ?? 0,                  color: 'var(--color-primary)' },
    { label: t.storage.cacheStorage, value: data.breakdown.caches ?? 0,                     color: 'var(--color-secondary)' },
    { label: t.storage.localStorage, value: data.localStorage,                               color: '#5ba87a' },
    { label: t.storage.serviceWorker,value: data.breakdown.serviceWorkerRegistrations ?? 0, color: '#b8874a' },
  ].filter(item => item.value > 0);

  const otherUsage = Math.max(0, data.usage - breakdownItems.reduce((acc, i) => acc + i.value, 0));
  if (otherUsage > 1024) {
    breakdownItems.push({ label: t.storage.other, value: otherUsage, color: 'var(--color-dark-300)' });
  }

  const detailItems = [
    { label: t.storage.documents,  value: counts?.documents  ?? '—' },
    { label: t.storage.audioCache, value: counts?.audioPages ?? '—' },
    { label: t.storage.voiceProfile, value: counts?.voiceProfiles ?? '—' },
    { label: t.storage.appSettings, value: settings.length || '—' },
  ];

  return (
    <div className={s.container}>
      <div className={s.overview}>
        <div className={s.ring} style={{ '--pct': `${usedPct.toFixed(1)}%` } as React.CSSProperties}>
          <div className={s.ringInner}>
            <span className={s.ringPct}>{usedPct.toFixed(1)}%</span>
            <span className={s.ringLabel}>{t.storage.used}</span>
          </div>
        </div>
        <div className={s.overviewStats}>
          <div className={s.stat}>
            <span className={s.statLabel}>{t.storage.used}</span>
            <span className={s.statValue}>{formatBytes(data.usage)}</span>
          </div>
          <div className={s.stat}>
            <span className={s.statLabel}>{t.storage.available}</span>
            <span className={s.statValue}>{formatBytes(data.quota - data.usage)}</span>
          </div>
          <div className={s.stat}>
            <span className={s.statLabel}>{t.storage.total}</span>
            <span className={s.statValue}>{formatBytes(data.quota)}</span>
          </div>
        </div>
      </div>

      <div className={s.totalBar}>
        {breakdownItems.map((item, i) => (
          <div key={i} className={s.totalBarSegment}
            style={{ width: `${(item.value / data.quota) * 100}%`, background: item.color }}
            title={`${item.label}: ${formatBytes(item.value)}`}
          />
        ))}
      </div>

      <ul className={s.breakdown}>
        {breakdownItems.map((item, i) => (
          <li key={i} className={s.breakdownItem}>
            <span className={s.dot} style={{ background: item.color }} />
            <span className={s.breakdownLabel}>{item.label}</span>
            <div className={s.breakdownBar}>
              <div className={s.breakdownFill}
                style={{ width: `${Math.min(100, (item.value / data.usage) * 100)}%`, background: item.color }}
              />
            </div>
            <span className={s.breakdownValue}>{formatBytes(item.value)}</span>
          </li>
        ))}
      </ul>

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

      {settings.length > 0 && (
        <ul className={s.settingsList}>
          {settings.map((entry) => (
            <li key={entry.key} className={s.settingsItem}>
              <span className={s.settingsKey}>{entry.key}</span>
              <span className={s.settingsValue}>{entry.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
