import React, { useState, useEffect } from 'react';
import s from './PageSelectorModal.module.css';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { JSONContent } from '@tiptap/core';
import { RootState } from '../../../store';
import { goToPage, setShowPageSelector } from '../../../store/pdfReaderSlice';
import { getDocumentById } from '../../../db';
import { useAppSelector } from '../../../store/hooks';
import { CustomModal } from './CustomModal';

const extractSnippet = (raw: string): string => {
  try {
    const node = JSON.parse(raw) as JSONContent;
    const parts: string[] = [];
    const walk = (n: JSONContent) => {
      if (n?.type === 'text' && n.text) parts.push(n.text as string);
      if (Array.isArray(n?.content)) n.content.forEach(walk);
    };
    walk(node);
    const text = parts.join(' ').replace(/\s+/g, ' ').trim();
    return text ? text.slice(0, 80) + (text.length > 80 ? '…' : '') : '';
  } catch {
    return '';
  }
};

export const PageSelectorModal: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentPage, totalPages, showPageSelector, documentId } = useSelector((state: RootState) => state.pdfReader);
  const { userData } = useAppSelector((state) => state.session);
  const [query, setQuery] = useState('');
  const [snippets, setSnippets] = useState<string[]>([]);

  useEffect(() => {
    if (!showPageSelector || !documentId) return;
    getDocumentById(documentId, userData.id).then((doc) => {
      if (!doc?.pagesContent) return;
      const pages = JSON.parse(doc.pagesContent) as JSONContent[];
      setSnippets(pages.map((p) => extractSnippet(JSON.stringify(p))));
    });
  }, [showPageSelector, documentId, userData.id]);

  if (!showPageSelector) return null;

  const onClose = () => dispatch(setShowPageSelector(false));

  const handlePageSelection = (page: number) => {
    dispatch(goToPage(page));
    dispatch(setShowPageSelector(false));
    if (documentId) navigate(`/document/${documentId}/reader`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const n = parseInt(query, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) handlePageSelection(n);
  };

  const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const filteredPages = query
    ? allPages.filter(page =>
        page.toString().includes(query) ||
        snippets[page - 1]?.toLowerCase().includes(query.toLowerCase())
      )
    : allPages;

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
          const isCurrent = currentPage === page;
          const isRead = page < currentPage;
          const snippet = snippets[page - 1];
          return (
            <li
              key={page}
              className={`${s.pageOption} ${isCurrent ? s.activePage : ''} ${isRead ? s.readPage : ''}`}
              onClick={() => handlePageSelection(page)}
            >
              <span className={s.pageNumber}>{page}</span>
              <span className={s.snippet}>
                {snippet || <span className={s.noSnippet}>—</span>}
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
