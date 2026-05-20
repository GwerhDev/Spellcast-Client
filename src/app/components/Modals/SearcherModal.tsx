import React, { useState, useEffect, useRef } from 'react';
import s from './SearcherModal.module.css';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { JSONContent } from '../../../magictext';
import { RootState } from '../../../store';
import { goToPage, setShowSearcher } from '../../../store/pdfReaderSlice';
import { getDocumentById } from '../../../db';
import { useAppSelector } from '../../../store/hooks';
import { CustomModal } from './CustomModal';
import { useLanguage } from '../../../i18n';

type SearchMode = 'page' | 'text';

interface TextMatch {
  page: number;
  context: string;
  matchStart: number;
  matchEnd: number;
}

const extractFullText = (raw: string): string => {
  try {
    const node = JSON.parse(raw) as JSONContent;
    const parts: string[] = [];
    const walk = (n: JSONContent) => {
      if (n?.type === 'text' && n.text) parts.push(n.text as string);
      if (Array.isArray(n?.content)) n.content.forEach(walk);
    };
    walk(node);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
};

const getSnippet = (text: string, maxLen = 80) =>
  text ? text.slice(0, maxLen) + (text.length > maxLen ? '…' : '') : '';

export const SearcherModal: React.FC = () => {
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentPage, totalPages, showSearcher, documentId } = useSelector(
    (state: RootState) => state.pdfReader
  );
  const { userData } = useAppSelector((state) => state.session);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('page');
  const [snippets, setSnippets] = useState<string[]>([]);
  const [fullTexts, setFullTexts] = useState<string[]>([]);
  const pageListRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!showSearcher || mode !== 'page') return;
    requestAnimationFrame(() => {
      const list = pageListRef.current;
      if (!list) return;
      const active = list.children[currentPage - 1] as HTMLElement | undefined;
      if (!active) return;
      list.scrollTo({ top: active.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop, behavior: 'smooth' });
    });
  }, [showSearcher, mode]);

  useEffect(() => {
    if (!showSearcher || !documentId) return;
    getDocumentById(documentId, userData.id).then((doc) => {
      if (!doc?.pagesContent) return;
      const pages = JSON.parse(doc.pagesContent) as JSONContent[];
      const texts = pages.map((p) => extractFullText(JSON.stringify(p)));
      setFullTexts(texts);
      setSnippets(texts.map((t) => getSnippet(t)));
    });
  }, [showSearcher, documentId, userData.id]);

  if (!showSearcher) return null;

  const onClose = () => {
    dispatch(setShowSearcher(false));
    setQuery('');
  };

  const handlePageSelection = (page: number) => {
    dispatch(goToPage(page));
    dispatch(setShowSearcher(false));
    if (documentId) navigate(`/document/${documentId}/reader`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || mode !== 'page') return;
    const n = parseInt(query, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) handlePageSelection(n);
  };

  // — Page mode —
  const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const filteredPages = query
    ? allPages.filter(
        (p) =>
          p.toString().includes(query) ||
          snippets[p - 1]?.toLowerCase().includes(query.toLowerCase())
      )
    : allPages;
  const jumpTarget = parseInt(query, 10);
  const canJump =
    mode === 'page' && !isNaN(jumpTarget) && jumpTarget >= 1 && jumpTarget <= totalPages;

  // — Text mode —
  const textMatches: TextMatch[] = [];
  if (mode === 'text' && query.trim().length >= 2) {
    const q = query.toLowerCase();
    fullTexts.forEach((text, idx) => {
      const lower = text.toLowerCase();
      let from = 0;
      let perPage = 0;
      while (perPage < 3) {
        const pos = lower.indexOf(q, from);
        if (pos === -1) break;
        const ctxStart = Math.max(0, pos - 60);
        const ctxEnd = Math.min(text.length, pos + q.length + 60);
        const prefix = ctxStart > 0 ? '…' : '';
        const suffix = ctxEnd < text.length ? '…' : '';
        textMatches.push({
          page: idx + 1,
          context: prefix + text.slice(ctxStart, ctxEnd) + suffix,
          matchStart: pos - ctxStart + prefix.length,
          matchEnd: pos - ctxStart + q.length + prefix.length,
        });
        from = pos + q.length;
        perPage++;
      }
    });
  }

  const renderHighlight = (ctx: string, start: number, end: number) => (
    <>
      {ctx.slice(0, start)}
      <mark className={s.highlight}>{ctx.slice(start, end)}</mark>
      {ctx.slice(end)}
    </>
  );

  return (
    <CustomModal title={t.reader.selectPage} show={showSearcher} onClose={onClose}>
      <div className={s.tabContainer}>
        <button
          className={`${s.tabButton} ${s.left} ${mode === 'page' ? s.activeTab : ''}`}
          onClick={() => { setMode('page'); setQuery(''); }}
        >
          {t.reader.byPage}
        </button>
        <button
          className={`${s.tabButton} ${s.right} ${mode === 'text' ? s.activeTab : ''}`}
          onClick={() => { setMode('text'); setQuery(''); }}
        >
          {t.reader.byText}
        </button>
      </div>

      <div className={s.searchRow}>
        <input
          type="text"
          autoFocus
          placeholder={
            mode === 'page'
              ? t.reader.pageNumberHint.replace('{max}', String(totalPages))
              : t.reader.searchTextHint
          }
          className={s.searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {canJump && (
          <button className={s.jumpButton} onClick={() => handlePageSelection(jumpTarget)}>
            {t.reader.goTo} {jumpTarget}
          </button>
        )}
      </div>

      {mode === 'page' && (
        <ul ref={pageListRef} className={s.pageList}>
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
                {isCurrent && <span className={s.currentBadge}>{t.reader.current}</span>}
                {isRead && <FontAwesomeIcon icon={faCheck} className={s.readIcon} />}
              </li>
            );
          })}
        </ul>
      )}

      {mode === 'text' && (
        <>
          {query.trim().length < 2 ? (
            <p className={s.hint}>{t.reader.typeAtLeast}</p>
          ) : textMatches.length === 0 ? (
            <p className={s.hint}>{t.reader.noResultsFor.replace('{query}', query)}</p>
          ) : (
            <ul className={s.pageList}>
              {textMatches.map((match, i) => (
                <li
                  key={i}
                  className={`${s.pageOption} ${match.page === currentPage ? s.activePage : ''}`}
                  onClick={() => handlePageSelection(match.page)}
                >
                  <span className={s.pageNumber}>{match.page}</span>
                  <span className={s.snippetWrap}>
                    {renderHighlight(match.context, match.matchStart, match.matchEnd)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </CustomModal>
  );
};
