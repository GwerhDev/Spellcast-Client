import s from './TabModal.module.css';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { IconButton } from '../Buttons/IconButton';

export interface TabDef {
  // Names the tab's button (`tab-<id>`), for tests.
  id?: string;
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

  // Portaled to <body> (as CustomModal is): opened from inside an element with a stacking
  // context of its own (e.g. the home page's corner), it would otherwise sit under whatever
  // the page draws after that element.
  return createPortal(
    <div className={s.overlay} onClick={onClose}>
      <div className={s.outterBorder}>
        <div className={s.modal} onClick={(e) => e.stopPropagation()}>
          <div className={s.header}>
            <h3 className={s.title}>{title}</h3>
            <IconButton icon={faXmark} variant="transparent" onClick={onClose} title="Close" />
          </div>
          <div className={s.body}>
            <div className={s.sidebar}>
              {tabs.map((tab, i) => (
                <button
                  key={i}
                  data-testid={`tab-${tab.id ?? i}`}
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
    </div>,
    document.body,
  );
};
