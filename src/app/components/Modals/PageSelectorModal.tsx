import React, { useState } from 'react';
import s from './PageSelectorModal.module.css';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { goToPage, setShowPageSelector } from '../../../store/pdfReaderSlice';
import { CustomModal } from './CustomModal';

const extractText = (raw: string): string => {
  try {
    const node = JSON.parse(raw);
    const parts: string[] = [];
    const walk = (n: any) => {
      if (n?.type === 'text' && n.text) parts.push(n.text);
      if (Array.isArray(n?.content)) n.content.forEach(walk);
    };
    walk(node);
    return parts.join(' ');
  } catch {
    return raw;
  }
};

export const PageSelectorModal: React.FC = () => {
  const dispatch = useDispatch();
  const { currentPage, totalPages, showPageSelector, pages } = useSelector((state: RootState) => state.pdfReader);
  const [query, setQuery] = useState('');

  if (!showPageSelector) return null;

  const onClose = () => dispatch(setShowPageSelector(false));

  const handlePageSelection = (page: number) => {
    dispatch(goToPage(page));
    dispatch(setShowPageSelector(false));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const n = parseInt(query, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) handlePageSelection(n);
  };

  const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const filteredPages = query
    ? allPages.filter(page => page.toString().includes(query))
    : allPages;

  const getSnippet = (page: number): string | null => {
    const raw = pages[page];
    if (!raw) return null;
    const text = extractText(raw).replace(/\s+/g, ' ').trim();
    return text ? text.slice(0, 72) + '…' : null;
  };

  const jumpTarget = parseInt(query, 10);
  const canJump = !isNaN(jumpTarget) && jumpTarget >= 1 && jumpTarget <= totalPages;

  return (
    <CustomModal title="Select a Page" show={showPageSelector} onClose={onClose}>
      <div className={s.searchRow}>
        <input
          type="text"
          autoFocus
          placeholder={`Search or jump to page (1–${totalPages})…`}
          className={s.searchInput}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {canJump && (
          <button className={s.jumpButton} onClick={() => handlePageSelection(jumpTarget)}>
            Go to {jumpTarget}
          </button>
        )}
      </div>
      <ul className={s.pageList}>
        {filteredPages.map((page) => {
          const snippet = getSnippet(page);
          const isCurrent = currentPage === page;
          const isRead = page < currentPage;
          return (
            <li
              key={page}
              className={`${s.pageOption} ${isCurrent ? s.activePage : ''} ${isRead ? s.readPage : ''}`}
              onClick={() => handlePageSelection(page)}
            >
              <span className={s.pageNumber}>{page}</span>
              <span className={s.snippet}>
                {snippet ?? <span className={s.noSnippet}>—</span>}
              </span>
              {isCurrent && <span className={s.currentBadge}>current</span>}
              {isRead && <FontAwesomeIcon icon={faCheck} className={s.readIcon} />}
            </li>
          );
        })}
      </ul>
    </CustomModal>
  );
};
