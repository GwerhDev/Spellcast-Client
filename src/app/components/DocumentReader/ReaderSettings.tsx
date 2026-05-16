import s from './ReaderSettings.module.css';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { faDesktop, faPalette } from '@fortawesome/free-solid-svg-icons';
import { RootState } from '../../../store';
import { setShowReaderSettings, setFitToWidth, setLightningMode } from '../../../store/pdfReaderSlice';
import { TabModal } from '../Modals/TabModal';
import { useLanguage } from '../../../i18n';

/* ── shared primitives ──────────────────────────────────── */

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  soon?: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, value, onChange, soon }) => (
  <div className={`${s.row} ${soon ? s.rowSoon : ''}`}>
    <div className={s.rowText}>
      <div className={s.rowLabelRow}>
        <span className={s.rowLabel}>{label}</span>
        {soon && <span className={s.soonTag}>soon</span>}
      </div>
      <span className={s.rowDesc}>{description}</span>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={value}
      className={`${s.toggle} ${value ? s.toggleOn : ''}`}
      onClick={() => !soon && onChange(!value)}
      tabIndex={soon ? -1 : 0}
    >
      <span className={`${s.toggleThumb} ${value ? s.toggleThumbOn : ''}`} />
    </button>
  </div>
);

/* ── tab content components ─────────────────────────────── */

const DisplayTab: React.FC = () => {
  const dispatch = useDispatch();
  const { fitToWidth, lightningMode } = useSelector((state: RootState) => state.pdfReader);
  const [smoothScroll, setSmoothScroll] = useState(true);
  const [doublePageView, setDoublePageView] = useState(false);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const { t } = useLanguage();

  const handleFitToWidth = (value: boolean) => {
    dispatch(setFitToWidth(value));
    localStorage.setItem('reader:fitToWidth', String(value));
  };

  const handleLightningMode = (value: boolean) => {
    dispatch(setLightningMode(value));
    localStorage.setItem('reader:lightningMode', String(value));
  };

  return (
    <div className={s.container}>
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.reader.layout}</p>
        <ToggleRow label={t.reader.fitToWidth} description={t.reader.fitToWidthDesc} value={fitToWidth} onChange={handleFitToWidth} />
        <ToggleRow soon label={t.reader.doublePageView} description={t.reader.doublePageViewDesc} value={doublePageView} onChange={setDoublePageView} />
      </div>
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.reader.reading}</p>
        <ToggleRow label={t.reader.lightningMode} description={t.reader.lightningModeDesc} value={lightningMode} onChange={handleLightningMode} />
        <ToggleRow soon label={t.reader.smoothScrolling} description={t.reader.smoothScrollingDesc} value={smoothScroll} onChange={setSmoothScroll} />
        <ToggleRow soon label={t.reader.showPageNumbers} description={t.reader.showPageNumbersDesc} value={showPageNumbers} onChange={setShowPageNumbers} />
      </div>
    </div>
  );
};

const AppearanceTab: React.FC = () => {
  const [highContrast, setHighContrast] = useState(false);
  const [sepiaMode, setSepiaMode] = useState(false);
  const [invertColors, setInvertColors] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { t } = useLanguage();

  return (
    <div className={s.container}>
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.reader.filters}</p>
        <ToggleRow soon label={t.reader.sepiaMode} description={t.reader.sepiaModeDesc} value={sepiaMode} onChange={setSepiaMode} />
        <ToggleRow soon label={t.reader.highContrast} description={t.reader.highContrastDesc} value={highContrast} onChange={setHighContrast} />
        <ToggleRow soon label={t.reader.invertColors} description={t.reader.invertColorsDesc} value={invertColors} onChange={setInvertColors} />
      </div>
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.reader.motion}</p>
        <ToggleRow soon label={t.reader.reduceMotion} description={t.reader.reduceMotionDesc} value={reducedMotion} onChange={setReducedMotion} />
      </div>
    </div>
  );
};

/* ── main component ─────────────────────────────────────── */

export const ReaderSettings: React.FC = () => {
  const dispatch = useDispatch();
  const { showReaderSettings } = useSelector((state: RootState) => state.pdfReader);
  const { t } = useLanguage();

  return (
    <TabModal
      show={showReaderSettings}
      onClose={() => dispatch(setShowReaderSettings(false))}
      title={t.reader.readerSettings}
      tabs={[
        { icon: faDesktop, label: t.reader.displayTab,    content: <DisplayTab /> },
        { icon: faPalette, label: t.reader.appearanceTab, content: <AppearanceTab /> },
      ]}
    />
  );
};
