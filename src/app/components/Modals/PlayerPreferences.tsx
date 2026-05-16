import s from './PlayerPreferences.module.css';
import React, { useState } from 'react';
import { useLanguage } from '../../../i18n';

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
      <span className={s.rowDescription}>{description}</span>
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

interface SliderRowProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  soon?: boolean;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, description, value, min, max, step, format, onChange, soon }) => (
  <div className={`${s.row} ${soon ? s.rowSoon : ''}`}>
    <div className={s.rowText}>
      <div className={s.rowLabelRow}>
        <span className={s.rowLabel}>{label}</span>
        {soon && <span className={s.soonTag}>soon</span>}
      </div>
      <span className={s.rowDescription}>{description}</span>
    </div>
    <div className={s.sliderGroup}>
      <span className={s.sliderValue}>{format(value)}</span>
      <input
        type="range"
        className={s.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={soon}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ '--slider-pct': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
      />
    </div>
  </div>
);

export const PlayerPreferences: React.FC = () => {
  const [autoplay, setAutoplay] = useState(false);
  const [continueOnPageTurn, setContinueOnPageTurn] = useState(true);
  const [rememberPosition, setRememberPosition] = useState(true);
  const [skipBlankPages, setSkipBlankPages] = useState(false);
  const [loopDocument, setLoopDocument] = useState(false);
  const [speed, setSpeed] = useState(1);
  const { t } = useLanguage();

  return (
    <div className={s.container}>
      <div className={s.section}>
        <p className={s.sectionTitle}>{t.player.playback}</p>
        <ToggleRow soon label={t.player.autoplay} description={t.player.autoplayDesc} value={autoplay} onChange={setAutoplay} />
        <ToggleRow soon label={t.player.continueOnPageTurn} description={t.player.continueOnPageTurnDesc} value={continueOnPageTurn} onChange={setContinueOnPageTurn} />
        <ToggleRow soon label={t.player.loopDocument} description={t.player.loopDocumentDesc} value={loopDocument} onChange={setLoopDocument} />
        <SliderRow soon label={t.player.readingSpeed} description={t.player.readingSpeedDesc} value={speed} min={0.5} max={2} step={0.25} format={(v) => `${v}×`} onChange={setSpeed} />
      </div>

      <div className={s.section}>
        <p className={s.sectionTitle}>{t.player.document}</p>
        <ToggleRow soon label={t.player.rememberPosition} description={t.player.rememberPositionDesc} value={rememberPosition} onChange={setRememberPosition} />
        <ToggleRow soon label={t.player.skipBlankPages} description={t.player.skipBlankPagesDesc} value={skipBlankPages} onChange={setSkipBlankPages} />
      </div>
    </div>
  );
};
