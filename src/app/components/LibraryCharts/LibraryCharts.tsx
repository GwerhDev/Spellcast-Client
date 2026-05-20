import React, { useEffect, useRef, useState } from 'react';
import s from './LibraryCharts.module.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getDocumentsFromDB } from '../../../db';
import { useAppSelector } from '../../../store/hooks';
import { Document } from '../../../interfaces';
import { FilterTabs } from '../Selectors/FilterTabs';
import { useLanguage } from '../../../i18n';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip);

type Period = '30d' | '60d' | '90d' | 'all';

interface Bucket { label: string; count: number; }

const DAY = 86_400_000;

const fmt = (d: Date) => d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
const fmtMonth = (d: Date) => d.toLocaleDateString('en', { month: 'short', year: '2-digit' });

const buildBuckets = (docs: Document[], period: Period): Bucket[] => {
  const now = Date.now();

  if (period === 'all') {
    if (!docs.length) return [];
    const earliest = Math.min(...docs.map(d => new Date(d.createdAt).getTime()));
    const cursor = new Date(earliest);
    cursor.setDate(1);
    const map = new Map<string, number>();
    while (cursor.getTime() <= now) {
      map.set(fmtMonth(cursor), 0);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    docs.forEach(d => {
      const key = fmtMonth(new Date(d.createdAt));
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map, ([label, count]) => ({ label, count }));
  }

  const totalDays = period === '30d' ? 30 : period === '60d' ? 60 : 90;
  const bucketDays = totalDays / 5;

  return Array.from({ length: 5 }, (_, i) => {
    const end = now - (4 - i) * bucketDays * DAY;
    const start = end - bucketDays * DAY;
    const count = docs.filter(d => {
      const t = new Date(d.createdAt).getTime();
      return t >= start && t < end;
    }).length;
    return { label: fmt(new Date(start)), count };
  });
};

const countIDB = (dbName: string, version: number, store: string): Promise<number> =>
  new Promise(resolve => {
    const req = indexedDB.open(dbName, version);
    req.onsuccess = e => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(store)) { db.close(); resolve(0); return; }
      const r = db.transaction(store, 'readonly').objectStore(store).count();
      r.onsuccess = () => { resolve(r.result); db.close(); };
      r.onerror  = () => { resolve(0); db.close(); };
    };
    req.onerror = () => resolve(0);
  });

export const LibraryCharts: React.FC = () => {
  const { t } = useLanguage();
  const { userData, logged } = useAppSelector(s => s.session);
  const [docs, setDocs] = useState<Document[]>([]);
  const [audioCount, setAudioCount] = useState<number | null>(null);
  const [period, setPeriod] = useState<Period>('30d');
  const chartRef = useRef<ChartJS<'line'>>(null);

  useEffect(() => {
    if (!logged) return;
    getDocumentsFromDB(userData.id).then(setDocs).catch(() => {});
    countIDB('spellcast-audio-cache', 1, 'audio_pages').then(setAudioCount);
  }, [logged, userData.id]);

  const periodTabs = [
    { id: '30d', label: t.overview.period30d },
    { id: '60d', label: t.overview.period60d },
    { id: '90d', label: t.overview.period90d },
    { id: 'all', label: t.overview.allTime   },
  ];

  const buckets = buildBuckets(docs, period);
  const inProgress = docs.filter(d => (d.progress?.currentPage ?? 0) > 0).length;
  const hasActivity = buckets.some(b => b.count > 0);

  const primary = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-primary').trim() || '#73a5cc';
  const textMuted = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-light-400').trim() || '#7b7b7b';
  const gridColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--surface-track').trim() || '#2f2f2f';

  const gradientPlugin = {
    id: 'gradientFill',
    beforeDatasetsDraw(chart: ChartJS) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      gradient.addColorStop(0, primary + '55');
      gradient.addColorStop(1, primary + '00');
      chart.data.datasets[0].backgroundColor = gradient;
    },
  };

  const chartData = {
    labels: buckets.map(b => b.label),
    datasets: [{
      data: buckets.map(b => b.count),
      fill: true,
      backgroundColor: primary + '33',
      borderColor: primary,
      borderWidth: 2,
      pointBackgroundColor: primary,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.4,
    }],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: {
      label: ctx => ` ${ctx.parsed.y} ${t.overview.docsAdded.toLowerCase()}`,
    }}},
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: textMuted, font: { size: 11 } }, border: { display: false } },
      y: {
        grid: { color: gridColor }, ticks: { color: textMuted, font: { size: 11 }, stepSize: 1, precision: 0 },
        border: { display: false }, beginAtZero: true,
      },
    },
  };

  const statCards = [
    { label: t.overview.total,      value: docs.length },
    { label: t.overview.inProgress, value: inProgress  },
    { label: t.overview.audioCached,value: audioCount ?? '—' },
    { label: t.overview.booksRead,  value: '—', note: true },
  ];

  return (
    <div className={s.chartsContainer}>
      <div className={s.chartCard}>
        <div className={s.cardHeader}>
          <span className={s.cardTitle}>{t.overview.activity}</span>
          <FilterTabs tabs={periodTabs} active={period} onChange={id => setPeriod(id as Period)} compact />
        </div>

        <div className={s.graphContainer}>
          {!hasActivity && (
            <div className={s.emptyOverlay}>
              <span>{t.overview.noActivity}</span>
            </div>
          )}
          <Line ref={chartRef} data={chartData} options={chartOptions} plugins={[gradientPlugin]} />
        </div>

        <p className={s.chartSubtitle}>{t.overview.docsAdded}</p>
      </div>

      <div className={s.statsRow}>
        {statCards.map((card, i) => (
          <div key={i} className={`${s.statCard} ${card.note ? s.statMuted : ''}`}>
            <span className={s.statValue}>{card.value}</span>
            <span className={s.statLabel}>{card.label}</span>
            {card.note && <span className={s.statNote}>{t.overview.readingTracking}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
