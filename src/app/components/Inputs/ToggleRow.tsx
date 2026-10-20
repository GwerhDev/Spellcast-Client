import React from 'react';
import s from '../../components/SpellReader/ReaderSettings.module.css';

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  soon?: boolean;
  // The "soon" tag's text (translated by the caller).
  soonLabel?: string;
  children?: React.ReactNode;
  // The switch's test id.
  testId?: string;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, value, onChange, soon, soonLabel = 'soon', children, testId }) => (
  <div className={`${s.rowGroup} ${soon ? s.rowSoon : ''}`}>
    <div className={s.row}>
      <div className={s.rowText}>
        <div className={s.rowLabelRow}>
          <span className={s.rowLabel}>{label}</span>
          {soon && <span className={s.soonTag}>{soonLabel}</span>}
        </div>
        <span className={s.rowDesc}>{description}</span>
      </div>
      <button
        type="button"
        role="switch"
        data-testid={testId}
        aria-checked={value}
        className={`${s.toggle} ${value ? s.toggleOn : ''}`}
        onClick={() => !soon && onChange(!value)}
        tabIndex={soon ? -1 : 0}
      >
        <span className={`${s.toggleThumb} ${value ? s.toggleThumbOn : ''}`} />
      </button>
    </div>
    {children && <div className={s.rowChildren}>{children}</div>}
  </div>
);
