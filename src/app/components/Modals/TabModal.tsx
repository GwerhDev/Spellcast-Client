import s from './TabModal.module.css';
import React, { useState } from 'react';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

export interface TabDef {
  icon: IconDefinition;
  label: string;
  content: React.ReactNode;
}

interface TabModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  tabs: TabDef[];
}

export const TabModal: React.FC<TabModalProps> = ({ show, onClose, title, tabs }) => {
  const [activeTab, setActiveTab] = useState(0);

  if (!show) return null;

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.header}>
          <h3 className={s.title}>{title}</h3>
          <button className={s.closeBtn} onClick={onClose}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className={s.body}>
          <div className={s.sidebar}>
            {tabs.map((tab, i) => (
              <button
                key={i}
                className={`${s.tabBtn} ${activeTab === i ? s.activeTabBtn : ''}`}
                onClick={() => setActiveTab(i)}
                title={tab.label}
              >
                <FontAwesomeIcon icon={tab.icon} />
              </button>
            ))}
          </div>
          <div className={s.content}>
            {tabs[activeTab]?.content}
          </div>
        </div>
      </div>
    </div>
  );
};
