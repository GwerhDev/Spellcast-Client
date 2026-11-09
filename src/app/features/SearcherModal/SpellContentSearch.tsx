import React, { useState, useEffect, useRef } from 'react';
import s from '../../components/Modals/SearcherModal.module.css';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { goToPage, recordReaderActivity } from '../../../store/spellReaderSlice';
import { useLanguage } from '../../../i18n';
import { findTextMatches, useSpellPages } from './searchSources';

/** A text with the part found marked. */
export const Highlight: React.FC<{ text: string; start: number; end: number }> = ({ text, start, end }) => (
  <>
    {text.slice(0, start)}
    <mark className={s.highlight}>{text.slice(start, end)}</mark>
    {text.slice(end)}
  </>
);

/** Goes to a page of the open Spell (in its reader). */
export function useGoToSpellPage(onDone: () => void) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const spellId = useAppSelector(state => state.spellReader.spellId);
  return (page: number) => {
    // Picked by the caster: their own action (see useAttentionGuard).
    dispatch(recordReaderActivity());
    dispatch(goToPage(page));
    onDone();
    if (spellId) navigate(`/spell/${spellId}/reader`);
  };
}

interface SpellContentSearchProps {
  onDone: () => void;
}

// The open Spell's pages, and its text: a page to go to (by its number, or what's on it).
export const SpellContentSearch: React.FC<SpellContentSearchProps> = ({ onDone }) => {
  const { t } = useLanguage();
  const { currentPage, totalPages, spellId } = useAppSelector(state => state.spellReader);
  const { fullTexts, snippets } = useSpellPages(spellId);
  const [query, setQuery] = useState('');
  const pageListRef = useRef<HTMLUListElement>(null);
  const handlePageSelection = useGoToSpellPage(onDone);

  useEffect(() => {
    // The plain (unfiltered) page list shows when it opens: scrolled to the current page.
    requestAnimationFrame(() => {
      const list = pageListRef.current;
      if (!list) return;
      const active = list.children[currentPage - 1] as HTMLElement | undefined;
      if (!active) return;
      list.scrollTo({ top: active.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop, behavior: 'smooth' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmedQuery = query.trim();
  const jumpTarget = parseInt(query, 10);
  const canJump = !isNaN(jumpTarget) && jumpTarget >= 1 && jumpTarget <= totalPages;

  const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const filteredPages = trimmedQuery
    ? allPages.filter(p => p.toString().includes(trimmedQuery) || snippets[p - 1]?.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : allPages;
  const textMatches = findTextMatches(fullTexts, trimmedQuery);
  const showNoResults = trimmedQuery.length >= 2 && textMatches.length === 0 && filteredPages.length === 0;

  return (
    <div className={s.panel}>
      <div className={s.searchRow}>
        <input
          type="text"
          autoFocus
          data-testid="searcher-input"
          placeholder={t.reader.searchOrJump.replace('{max}', String(totalPages))}
          className={s.searchInput}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && canJump) handlePageSelection(jumpTarget); }}
        />
        {canJump && (
          <button data-testid="searcher-jump-btn" className={s.jumpButton} onClick={() => handlePageSelection(jumpTarget)}>
            {t.reader.goTo} {jumpTarget}
          </button>
        )}
      </div>

      {showNoResults ? (
        <p data-testid="searcher-no-results" className={s.hint}>{t.reader.noResultsFor.replace('{query}', query)}</p>
      ) : textMatches.length > 0 ? (
        <ul className={s.pageList}>
          {textMatches.map((match, i) => (
            <li
              key={i}
              data-testid="searcher-match"
              className={`${s.pageOption} ${match.page === currentPage ? s.activePage : ''}`}
              onClick={() => handlePageSelection(match.page)}
            >
              <span className={s.pageNumber}>{match.page}</span>
              <span className={s.snippetWrap}><Highlight text={match.context} start={match.matchStart} end={match.matchEnd} /></span>
            </li>
          ))}
        </ul>
      ) : (
        <ul ref={pageListRef} className={s.pageList}>
          {filteredPages.map(page => {
            const isCurrent = currentPage === page;
            const isRead = page < currentPage;
            const snippet = snippets[page - 1];
            return (
              <li
                key={page}
                data-testid={`searcher-page-${page}`}
                className={`${s.pageOption} ${isCurrent ? s.activePage : ''} ${isRead ? s.readPage : ''}`}
                onClick={() => handlePageSelection(page)}
              >
                <span className={s.pageNumber}>{page}</span>
                <span className={s.snippet}>{snippet || <span className={s.noSnippet}>—</span>}</span>
                {isCurrent && <span className={s.currentBadge}>{t.reader.current}</span>}
                {isRead && <FontAwesomeIcon icon={faCheck} className={s.readIcon} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
