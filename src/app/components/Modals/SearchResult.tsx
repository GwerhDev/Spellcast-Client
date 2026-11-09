import React from 'react';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import s from './SearcherModal.module.css';

interface SearchResultProps {
  icon: IconDefinition;
  title: string;
  // What it is, under its title.
  desc?: React.ReactNode;
  onClick: () => void;
  testId: string;
}

// Something the app's search found (a Spell, a setting): its icon, its name and what it is.
export const SearchResult: React.FC<SearchResultProps> = ({ icon, title, desc, onClick, testId }) => (
  <li data-testid={testId} className={s.pageOption} onClick={onClick}>
    <FontAwesomeIcon icon={icon} className={s.resultIcon} />
    <span className={s.resultText}>
      <span className={s.resultTitle}>{title}</span>
      {desc ? <span className={s.resultDesc}>{desc}</span> : null}
    </span>
  </li>
);
