import React from 'react';
import s from './PageList.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faNewspaper } from '@fortawesome/free-solid-svg-icons';

interface PageListProps {
  pages: string[];
  onPageClick: (pageIndex: number) => void;
}

export const PageList: React.FC<PageListProps> = ({ pages, onPageClick }) => {
  return (
    <div className={s.pageGrid}>
      {pages.map((_, index) => (
        <div
          key={index}
          className={s.pageItem}
          onClick={() => onPageClick(index)}
        >
          <FontAwesomeIcon icon={faNewspaper} />
          <span className={s.pageNumber}>Page {index + 1}</span>
        </div>
      ))}
    </div>
  );
};
