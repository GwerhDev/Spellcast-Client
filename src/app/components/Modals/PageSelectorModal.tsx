import React, { useState } from 'react';
import s from './PageSelectorModal.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { goToPage, setShowPageSelector } from '../../../store/pdfReaderSlice';
import { CustomModal } from './CustomModal';

export const PageSelectorModal: React.FC = () => {
  const dispatch = useDispatch();
  const { currentPage, totalPages, showPageSelector, pages } = useSelector((state: RootState) => state.pdfReader);
  const [searchTerm, setSearchTerm] = useState('');
  const [jumpValue, setJumpValue] = useState('');

  if (!showPageSelector) return null;

  const onClose = () => dispatch(setShowPageSelector(false));

  const handlePageSelection = (page: number) => {
    dispatch(goToPage(page));
    dispatch(setShowPageSelector(false));
  };

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(jumpValue, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) handlePageSelection(n);
  };

  const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const filteredPages = searchTerm
    ? allPages.filter(page => page.toString().includes(searchTerm))
    : allPages;

  const getSnippet = (page: number) => {
    const text = pages[page];
    if (!text) return null;
    return text.replace(/\s+/g, ' ').trim().slice(0, 70) + '…';
  };

  return (
    <CustomModal title="Select a Page" show={showPageSelector} onClose={onClose}>
      <form onSubmit={handleJump} className={s.jumpForm}>
        <input
          type="number"
          min={1}
          max={totalPages}
          placeholder={`Jump to page (1–${totalPages})`}
          className={s.searchInput}
          value={jumpValue}
          onChange={e => setJumpValue(e.target.value)}
        />
        <button type="submit" className={s.jumpButton}>Go</button>
      </form>
      <input
        type="text"
        placeholder="Search by page number…"
        className={s.searchInput}
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
      <ul className={s.pageList}>
        {filteredPages.map((page) => {
          const snippet = getSnippet(page);
          const isCurrent = currentPage === page;
          return (
            <li
              key={page}
              className={`${s.pageOption} ${isCurrent ? s.activePage : ''}`}
              onClick={() => handlePageSelection(page)}
            >
              <span className={s.pageNumber}>{page}</span>
              {snippet
                ? <span className={s.snippet}>{snippet}</span>
                : <span className={s.noSnippet}>Page {page}</span>
              }
              {isCurrent && <span className={s.currentBadge}>current</span>}
            </li>
          );
        })}
      </ul>
    </CustomModal>
  );
};
