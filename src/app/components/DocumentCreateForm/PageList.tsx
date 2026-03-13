import React from 'react';
import s from './PageList.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faNewspaper, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';

interface PageListProps {
  pages: string[];
  currentPage: number;
  onPageClick: (pageIndex: number) => void;
  onPageDelete: (pageIndex: number) => void;
  onAddPage: () => void;
}

export const PageList: React.FC<PageListProps> = ({ pages, currentPage, onPageClick, onPageDelete, onAddPage }) => {

  const handleDelete = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    onPageDelete(index);
  }

  return (
    <div className={s.pageGrid}>
      <div className={s.pagesHeader}>
        <h2 className={s.pagesTitle}>Pages ({pages.length})</h2>
      </div>
      {pages.map((_, index) => (
        <div
          key={index}
          className={`${s.pageItem} ${index === currentPage && s.activePage}`}
          onClick={() => onPageClick(index)}
        >
          <button className={s.deleteButton} onClick={(e) => handleDelete(e, index)}>
            <FontAwesomeIcon icon={faTrash} size='xs' />
          </button>
          <FontAwesomeIcon icon={faNewspaper} />
          <small className={s.pageNumber}>Page {index + 1}</small>
        </div>
      ))}
      <div className={s.addPageItem} onClick={onAddPage}>
        <FontAwesomeIcon icon={faPlus} size="2x" />
        <small>Add Page</small>
      </div>
    </div>
  );
};
