import s from './ReaderSettings.module.css';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { faDesktop, faPalette } from '@fortawesome/free-solid-svg-icons';
import { RootState } from '../../../store';
import { setShowReaderSettings, setFitToWidth, setLightningMode } from '../../../store/pdfReaderSlice';
import { TabModal } from '../Modals/TabModal';

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
        <p className={s.sectionTitle}>Layout</p>
        <ToggleRow label="Fit to width" description="Stretch pages to fill the full width of the viewer." value={fitToWidth} onChange={handleFitToWidth} />
        <ToggleRow soon label="Double page view" description="Show two pages side by side on wide screens." value={doublePageView} onChange={setDoublePageView} />
      </div>
      <div className={s.section}>
        <p className={s.sectionTitle}>Reading</p>
        <ToggleRow label="Lightning mode" description="Highlight the sentence currently being read aloud." value={lightningMode} onChange={handleLightningMode} />
        <ToggleRow soon label="Smooth scrolling" description="Animate transitions between pages." value={smoothScroll} onChange={setSmoothScroll} />
        <ToggleRow soon label="Show page numbers" description="Display an overlay with the current page number." value={showPageNumbers} onChange={setShowPageNumbers} />
      </div>
    </div>
  );
};

const AppearanceTab: React.FC = () => {
  const [highContrast, setHighContrast] = useState(false);
  const [sepiaMode, setSepiaMode] = useState(false);
  const [invertColors, setInvertColors] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  return (
    <div className={s.container}>
      <div className={s.section}>
        <p className={s.sectionTitle}>Filters</p>
        <ToggleRow soon label="Sepia mode" description="Apply a warm sepia tint to the document." value={sepiaMode} onChange={setSepiaMode} />
        <ToggleRow soon label="High contrast" description="Increase contrast for easier reading." value={highContrast} onChange={setHighContrast} />
        <ToggleRow soon label="Invert colors" description="Invert document colors for dark background reading." value={invertColors} onChange={setInvertColors} />
      </div>
      <div className={s.section}>
        <p className={s.sectionTitle}>Motion</p>
        <ToggleRow soon label="Reduce motion" description="Disable animations and transitions." value={reducedMotion} onChange={setReducedMotion} />
      </div>
    </div>
  );
};

/* ── main component ─────────────────────────────────────── */

export const ReaderSettings: React.FC = () => {
  const dispatch = useDispatch();
  const { showReaderSettings } = useSelector((state: RootState) => state.pdfReader);

  return (
    <TabModal
      show={showReaderSettings}
      onClose={() => dispatch(setShowReaderSettings(false))}
      title="Reader Settings"
      tabs={[
        { icon: faDesktop, label: 'Display',    content: <DisplayTab /> },
        { icon: faPalette, label: 'Appearance', content: <AppearanceTab /> },
      ]}
    />
  );
};
