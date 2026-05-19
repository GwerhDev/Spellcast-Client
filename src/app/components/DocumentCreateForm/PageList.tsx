import React, { useRef, useEffect } from 'react';
import s from './PageList.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faNewspaper, faTrash, faPlus, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../../i18n';

interface PageListProps {
  pages: string[];
  currentPage: number;
  onPageClick: (pageIndex: number) => void;
  onPageDelete?: (pageIndex: number) => void;
  onAddPage?: () => void;
  pdfProgress?: { current: number; total: number } | null;
}

export const PageList: React.FC<PageListProps> = ({ pages, currentPage, onPageClick, onPageDelete, onAddPage, pdfProgress }) => {
  const { t } = useLanguage();
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const active = grid.children[currentPage] as HTMLElement | undefined;
    if (!active) return;
    grid.scrollTo({ top: active.getBoundingClientRect().top - grid.getBoundingClientRect().top + grid.scrollTop, behavior: 'smooth' });
  }, [currentPage]);

  const handleDelete = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    onPageDelete?.(index);
  };

  const getProgressState = (index: number): 'done' | 'processing' | 'pending' | null => {
    if (!pdfProgress) return null;
    if (index < pdfProgress.current - 1) return 'done';
    if (index === pdfProgress.current - 1) return 'processing';
    return 'pending';
  };

  return (
    <div ref={gridRef} className={s.pageGrid}>
      {pages.map((_, index) => {
        const progressState = getProgressState(index);
        return (
          <div
            key={index}
            className={[
              s.pageItem,
              index === currentPage ? s.activePage : '',
              progressState === 'processing' ? s.processingPage : '',
              progressState === 'pending' ? s.pendingPage : '',
            ].filter(Boolean).join(' ')}
            onClick={() => onPageClick(index)}
          >
            {onPageDelete && (
              <button className={s.deleteButton} onClick={(e) => handleDelete(e, index)}>
                <FontAwesomeIcon icon={faTrash} size='xs' />
              </button>
            )}
            {progressState === 'done' && (
              <span className={s.doneIndicator}>
                <FontAwesomeIcon icon={faCheck} size='xs' />
              </span>
            )}
            {progressState === 'processing'
              ? <FontAwesomeIcon icon={faSpinner} spin />
              : <FontAwesomeIcon icon={faNewspaper} />
            }
            <small className={s.pageNumber}>{t.document.page} {index + 1}</small>
          </div>
        );
      })}
      {onAddPage && (
        <div title={t.document.addPage} className={s.addPageItem} onClick={onAddPage}>
          <FontAwesomeIcon icon={faPlus} />
        </div>
      )}
    </div>
  );
};
