import React from 'react';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import s from './InputTypeSelector.module.css';

interface FilterTab {
  id: string;
  label: string;
  icon?: IconDefinition;
}

interface FilterTabsProps {
  tabs: FilterTab[];
  active: string;
  onChange: (id: string) => void;
  compact?: boolean;
}

const positionClass = (index: number, total: number) => {
  if (total === 1) return '';
  if (index === 0) return s.left;
  if (index === total - 1) return s.right;
  return s.middle;
};

export const FilterTabs: React.FC<FilterTabsProps> = ({ tabs, active, onChange, compact }) => (
  <div className={s.container} style={compact ? { marginBottom: 0 } : undefined}>
    <span className={s.buttonsContainer}>
      {tabs.map((tab, i) => (
        <button
          key={tab.id}
          className={`${s.tabButton} ${positionClass(i, tabs.length)} ${active === tab.id ? s.active : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <FontAwesomeIcon icon={tab.icon} />}
          <span className={s.title}>{tab.label}</span>
        </button>
      ))}
    </span>
  </div>
);
