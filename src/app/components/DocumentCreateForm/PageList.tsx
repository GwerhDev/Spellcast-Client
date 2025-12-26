import React from 'react';
import s from './PageList.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faNewspaper, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';

interface PageListProps {
  pages: string[];
  onPageClick: (pageIndex: number) => void;
  onPageDelete: (pageIndex: number) => void;
  onAddPage: () => void;
}

export const PageList: React.FC<PageListProps> = ({ pages, onPageClick, onPageDelete, onAddPage }) => {

  const handleDelete = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    onPageDelete(index);
  }

  return (
    <div className={s.pageGrid}>
      {pages.map((_, index) => (
        <div
          key={index}
          className={s.pageItem}
          onClick={() => onPageClick(index)}
        >
          <button className={s.deleteButton} onClick={(e) => handleDelete(e, index)}>
            <FontAwesomeIcon icon={faTrash} size='xs'/>
          </button>
          <FontAwesomeIcon icon={faNewspaper} />
          <span className={s.pageNumber}>Page {index + 1}</span>
        </div>
      ))}
      <div className={s.addPageItem} onClick={onAddPage}>
        <FontAwesomeIcon icon={faPlus} size="2x" />
        <span>Add Page</span>
      </div>
    </div>
  );
};
