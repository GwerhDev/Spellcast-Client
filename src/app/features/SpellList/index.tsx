import s from './index.module.css';
import grid from '../../components/SpellGrid/index.module.css';
import React, { useEffect, useRef, useState } from 'react';
import { getSpellsFromDB } from '../../../db';
import { getAllOriginalPdfIds } from '../../../db/originalPdfs';
import { useAppSelector } from '../../../store/hooks';
import { Spell } from '../../../interfaces';
import { SpellCard } from '../../components/Cards/SpellCard';
import { SpellDetailModal } from '../../components/Modals/SpellDetailModal';
import { EmptyState } from '../../components/EmptyState';
import { useCoverFrame3DSection } from '../../../hooks/useCoverFrame3DSection';
import { faScroll, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../../i18n';
import { useInfiniteList } from '../../../hooks/useInfiniteList';

export type GrimoireFilter = 'all' | 'local' | 'cloud';
export type GrimoireSpellFilter = 'all' | 'reading' | 'pdf' | 'unprocessed';

interface SpellListProps {
  query?: string;
  filter?: GrimoireFilter;
  docFilter?: GrimoireSpellFilter;
  selectionMode?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onSelectableIdsChange?: (ids: string[]) => void;
}

export const SpellList: React.FC<SpellListProps> = ({ query = '', filter = 'local', docFilter = 'all', selectionMode, selectedIds = [], onToggleSelect, onSelectableIdsChange }) => {
  // A card click opens the spell's detail in a modal (the same one the player's cover
  // opens), where all of its actions live.
  const [detailSpellId, setDetailSpellId] = useState<string | null>(null);
  const { t } = useLanguage();
  const { userData, logged } = useAppSelector(state => state.session);
  const { spellId: activeDocId, listVersion } = useAppSelector(state => state.spellReader);
  const uploadQueue = useAppSelector(state => state.spellUpload.queue);
  const audioPlaying = useAppSelector(state => state.audioPlayer.isPlaying);
  const browserPlaying = useAppSelector(state => state.browserPlayer.isPlaying);
  const [documents, setDocuments] = useState<Spell[]>([]);
  // TCORE-90: which spells have an original PDF stored, fetched once per list load (a
  // single batch read) instead of reading a `pdf` field off each Spell record.
  const [pdfIds, setPdfIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const sectionRef = useRef<HTMLDivElement>(null);

  const fetchLocal = async () => {
    if (!logged) { setIsLoading(false); return; }
    try {
      // No going back to the loading state on a refetch (isLoading starts true, for the
      // first load only): the skeleton replaces everything this renders, including the
      // open detail modal, which would close and reopen on every change saved from it.
      const [docs, ids] = await Promise.all([getSpellsFromDB(userData.id), getAllOriginalPdfIds()]);
      setDocuments(docs.sort((a: Spell, b: Spell) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setPdfIds(ids);
    } catch (error) {
      console.error('Failed to fetch local spells:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 'all' and 'local' both read from IndexedDB for now.
    // When cloud is wired up: 'cloud' → API fetch, 'all' → merge both sources.
    if (filter !== 'cloud') fetchLocal();
    //eslint-disable-next-line
  }, [userData.id, filter, listVersion]);

  const q = query.trim().toLowerCase();
  const byQuery = q ? documents.filter(d => d.title.toLowerCase().includes(q)) : documents;
  const filtered = byQuery.filter(d => {
    if (docFilter === 'reading') return (d.progress?.currentPage ?? 0) > 0;
    if (docFilter === 'pdf') return pdfIds.has(d.id);
    if (docFilter === 'unprocessed') return !d.pagesContent;
    return true;
  });
  const { visible, hasMore, sentinelRef } = useInfiniteList(filtered);

  // TCORE-124: gates 3D corners for this whole grid -- passed straight to each SpellCard
  // below as show3D. See useCoverFrame3DSection/useCoverFrame3DGate for the actual
  // conditions.
  const show3D = useCoverFrame3DSection(sectionRef);

  // "Select all" (GrimoireLanding) needs every id matching the current search/tab, not
  // just the paginated `visible` subset -- kept in a ref so this doesn't re-run just
  // because the parent passed a new inline callback identity.
  const onSelectableIdsChangeRef = useRef(onSelectableIdsChange);
  onSelectableIdsChangeRef.current = onSelectableIdsChange;
  useEffect(() => {
    onSelectableIdsChangeRef.current?.(filtered.map(d => d.id));
    //eslint-disable-next-line
  }, [documents, query, docFilter, pdfIds]);

  if (isLoading) return (
    <div className={s.container}>
      <div className={grid.grid}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={grid.skeletonCard} data-testid="skeleton-card">
            <div className={`${grid.skeletonCover} ${grid.skeletonLine}`} />
            <div className={grid.skeletonFooter}>
              <div className={`${grid.skeletonLine} ${grid.skeletonTitle}`} />
              <div className={`${grid.skeletonLine} ${grid.skeletonTitleShort}`} />
              <div className={`${grid.skeletonLine} ${grid.skeletonDate}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  if (documents.length === 0) return (
    <EmptyState
      testId="spell-list-empty"
      icon={faScroll}
      message={filter === 'local' ? t.spell.noLocalSpells : t.spell.noSpells}
    />
  );
  if (filtered.length === 0) return (
    <EmptyState testId="spell-list-no-results" icon={faMagnifyingGlass} message={t.spell.noSpells} />
  );

  return (
    <>
      <div className={s.container}>
        <div className={grid.grid} ref={sectionRef}>
          {visible.map((doc) => {
            const uploadJob = uploadQueue.find(j => j.targetDocId === doc.id && (j.status === 'queued' || j.status === 'processing')) ?? null;
            return (
              <SpellCard
                key={doc.id}
                doc={doc}
                onClick={() => setDetailSpellId(doc.id)}
                isActive={activeDocId === doc.id}
                isPlaying={activeDocId === doc.id && (audioPlaying || browserPlaying)}
                uploadJob={uploadJob}
                selectionMode={selectionMode}
                selected={selectedIds.includes(doc.id)}
                onToggleSelect={() => onToggleSelect?.(doc.id)}
                show3D={show3D}
              />
            );
          })}
        </div>
        {hasMore && <div ref={sentinelRef} data-testid="spell-list-sentinel" className={grid.sentinel} />}
      </div>
      <SpellDetailModal spellId={detailSpellId} show={detailSpellId !== null} onClose={() => setDetailSpellId(null)} />
    </>
  );
};
