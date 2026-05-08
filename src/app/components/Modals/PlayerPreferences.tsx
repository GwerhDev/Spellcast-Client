import s from './PlayerPreferences.module.css';
import React, { useState } from 'react';

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

  return (
    <div className={s.container}>
      <div className={s.section}>
        <p className={s.sectionTitle}>Playback</p>
        <ToggleRow soon label="Autoplay" description="Start playing automatically when a document is loaded." value={autoplay} onChange={setAutoplay} />
        <ToggleRow soon label="Continue on page turn" description="Keep playing when navigating to the next or previous page." value={continueOnPageTurn} onChange={setContinueOnPageTurn} />
        <ToggleRow soon label="Loop document" description="Restart from the beginning when the last page finishes." value={loopDocument} onChange={setLoopDocument} />
        <SliderRow soon label="Reading speed" description="Adjust the playback speed of the voice." value={speed} min={0.5} max={2} step={0.25} format={(v) => `${v}×`} onChange={setSpeed} />
      </div>

      <div className={s.section}>
        <p className={s.sectionTitle}>Document</p>
        <ToggleRow soon label="Remember position" description="Resume from where you left off when reopening a document." value={rememberPosition} onChange={setRememberPosition} />
        <ToggleRow soon label="Skip blank pages" description="Automatically skip pages with no readable content." value={skipBlankPages} onChange={setSkipBlankPages} />
      </div>
    </div>
  );
};
