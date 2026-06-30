import React from 'react';
import s from '../../components/DocumentReader/ReaderSettings.module.css';

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  soon?: boolean;
  children?: React.ReactNode;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, value, onChange, soon, children }) => (
  <div className={`${s.rowGroup} ${soon ? s.rowSoon : ''}`}>
    <div className={s.row}>
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
    {children && <div className={s.rowChildren}>{children}</div>}
  </div>
);
