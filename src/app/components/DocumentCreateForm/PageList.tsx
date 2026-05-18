import React from 'react';
import s from './PageList.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faNewspaper, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../../i18n';

interface PageListProps {
  pages: string[];
  currentPage: number;
  onPageClick: (pageIndex: number) => void;
  onPageDelete?: (pageIndex: number) => void;
  onAddPage?: () => void;
}

export const PageList: React.FC<PageListProps> = ({ pages, currentPage, onPageClick, onPageDelete, onAddPage }) => {
  const { t } = useLanguage();

  const handleDelete = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    onPageDelete(index);
  };

  return (
    <div className={s.pageGrid}>
      {pages.map((_, index) => (
        <div
          key={index}
          className={`${s.pageItem} ${index === currentPage && s.activePage}`}
          onClick={() => onPageClick(index)}
        >
          {onPageDelete && (
            <button className={s.deleteButton} onClick={(e) => handleDelete(e, index)}>
              <FontAwesomeIcon icon={faTrash} size='xs' />
            </button>
          )}
          <FontAwesomeIcon icon={faNewspaper} />
          <small className={s.pageNumber}>{t.document.page} {index + 1}</small>
        </div>
      ))}
      {onAddPage && (
        <div title={t.document.addPage} className={s.addPageItem} onClick={onAddPage}>
          <FontAwesomeIcon icon={faPlus} />
        </div>
      )}
    </div>
  );
};
