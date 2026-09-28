import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import s from './Inventory.module.css';

export interface BagFilterTab {
  id: string;
  label: string;
  icon: IconDefinition;
}

interface BagFilterTabsProps {
  tabs: BagFilterTab[];
  active: string;
  onChange: (id: string) => void;
}

// Icon tabs attached to the bag's right edge (a row above it on narrow screens); the label
// shows on hover/focus. The active tab takes the bag's own surface so it reads as part of it.
export const BagFilterTabs = ({ tabs, active, onChange }: BagFilterTabsProps) => (
  <div role="tablist" aria-orientation="vertical" data-testid="bag-filter-tabs" className={s.tabs}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={tab.id === active}
        aria-label={tab.label}
        data-testid={`bag-filter-${tab.id}`}
        className={`${s.tab} ${tab.id === active ? s.tabActive : ''}`}
        onClick={() => onChange(tab.id)}
      >
        <FontAwesomeIcon icon={tab.icon} />
        <span className={s.tabLabel} aria-hidden="true">{tab.label}</span>
      </button>
    ))}
  </div>
);
