import React from 'react';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import s from './SegmentedTabs.module.css';

export interface SegmentedTab {
  id: string;
  label: string;
  icon?: IconDefinition;
}

interface SegmentedTabsProps {
  tabs: SegmentedTab[];
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

// The one shared component in the button-consistency migration's "segmented tabs" family —
// FilterTabs and InputTypeSelector were two near-identical implementations of this exact
// joined-pill-group pattern (rounded ends, square middle, active fill). TabModal's own
// sidebar tabs are a visually different pattern (a vertical rail of independent icon-only
// squares) and don't belong here.
export const SegmentedTabs: React.FC<SegmentedTabsProps> = ({ tabs, active, onChange, compact }) => (
  <div className={s.container} style={compact ? { marginBottom: 0 } : undefined}>
    <span className={s.buttonsContainer}>
      {tabs.map((tab, i) => (
        <button
          key={tab.id}
          data-testid={`segmented-tab-${tab.id}`}
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
