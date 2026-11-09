import React from 'react';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import s from './SearcherModal.module.css';

interface SearchEmptyProps {
  icon: IconDefinition;
  children: React.ReactNode;
  testId: string;
}

// What a search's tab says when it lists nothing (what it can find, or that nothing matches):
// its icon, and the message.
export const SearchEmpty: React.FC<SearchEmptyProps> = ({ icon, children, testId }) => (
  <div className={s.empty} data-testid={testId}>
    <FontAwesomeIcon icon={icon} className={s.emptyIcon} />
    <p className={s.hint}>{children}</p>
  </div>
);
