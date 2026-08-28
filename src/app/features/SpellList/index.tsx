import s from './index.module.css';
import grid from '../../components/SpellGrid/index.module.css';
import React, { useEffect, useState } from 'react';
import { getSpellsFromDB, deleteSpellFromDB } from '../../../db';
import { getAllOriginalPdfIds } from '../../../db/originalPdfs';
import { useNavigate, useLocation } from 'react-router-dom';
import { DeleteConfirmModal } from '../../components/Modals/DeleteConfirmModal';
// import { SpellExportModal } from '../../components/Modals/SpellExportModal'; // .spell export: future
import { useAppSelector } from '../../../store/hooks';
import { Spell } from '../../../interfaces';
import { SpellCard } from '../../components/Cards/SpellCard';
import { EmptyState } from '../../components/EmptyState';
// import { useSpellExport } from '../../../hooks/useSpellExport'; // .spell export: future
import { faScroll, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { useDispatch } from 'react-redux';
import { setAutoPlayOnLoad, resetBrowserPlayer, requestTogglePlay } from '../../../store/browserPlayerSlice';
import { setAutoPlayOnLoad as setAudioAutoPlayOnLoad, resetAudioPlayer, requestTogglePlay as requestAudioTogglePlay } from '../../../store/audioPlayerSlice';
import { setSpellFile, setSpellInfo, resetSpellReader } from '../../../store/spellReaderSlice';
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
}

export const SpellList: React.FC<SpellListProps> = ({ query = '', filter = 'local', docFilter = 'all', selectionMode, selectedIds = [], onToggleSelect }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const { userData, logged } = useAppSelector(state => state.session);
  const { spellId: activeDocId, isLoaded: readerLoaded, listVersion } = useAppSelector(state => state.spellReader);
  const uploadQueue = useAppSelector(state => state.spellUpload.queue);
  const audioPlaying = useAppSelector(state => state.audioPlayer.isPlaying);
  const browserPlaying = useAppSelector(state => state.browserPlayer.isPlaying);
  const selectedVoiceType = useAppSelector(state => state.voice.selectedVoice.type);
  const [documents, setDocuments] = useState<Spell[]>([]);
  // TCORE-90: which spells have an original PDF stored, fetched once per list load (a
  // single batch read) instead of reading a `pdf` field off each Spell record.
  const [pdfIds, setPdfIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ id: string, title: string } | null>(null);
  // .spell export UI is hidden for now (not ready to ship this phase) — kept wired but
  // commented out so it's a one-line re-enable later. See openExportModal below and the
  // SpellExportModal render at the bottom of this file.
  // const { exportTarget, openExportModal, closeExportModal, handleExport, isExporting } = useSpellExport();

  const handlePlay = (doc: Spell) => {
    if (activeDocId === doc.id && (readerLoaded || audioPlaying || browserPlaying)) {
      if (selectedVoiceType !== 'browser') {
        dispatch(requestAudioTogglePlay());
      } else {
        dispatch(requestTogglePlay());
      }
      return;
    }
    const totalPages = doc.pagesContent ? (() => { try { return JSON.parse(doc.pagesContent!).length; } catch { return 1; } })() : 1;
    dispatch(resetSpellReader());
    dispatch(resetBrowserPlayer());
    dispatch(resetAudioPlayer());
    dispatch(setAutoPlayOnLoad(true));
    dispatch(setAudioAutoPlayOnLoad(true));
    dispatch(setSpellFile({ id: doc.id, title: doc.title, progress: doc.progress }));
    dispatch(setSpellInfo({ totalPages }));
  };

  const fetchLocal = async () => {
    if (!logged) { setIsLoading(false); return; }
    try {
      setIsLoading(true);
      const [docs, ids] = await Promise.all([getSpellsFromDB(userData.id), getAllOriginalPdfIds()]);
      setDocuments(docs.sort((a: Spell, b: Spell) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setPdfIds(ids);
    } catch (error) {
      console.error('Failed to fetch local documents:', error);
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

  const openDeleteModal = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDoc({ id, title });
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setSelectedDoc(null);
    setShowDeleteModal(false);
  };

  const handleDeleteConfirm = async () => {
    if (selectedDoc && userData?.id) {
      try {
        await deleteSpellFromDB(selectedDoc.id, userData.id);
        fetchLocal();
      } catch (error) {
        console.error('Failed to delete document:', error);
      } finally {
        closeDeleteModal();
      }
    }
  };

  const q = query.trim().toLowerCase();
  const byQuery = q ? documents.filter(d => d.title.toLowerCase().includes(q)) : documents;
  const filtered = byQuery.filter(d => {
    if (docFilter === 'reading') return (d.progress?.currentPage ?? 0) > 0;
    if (docFilter === 'pdf') return pdfIds.has(d.id);
    if (docFilter === 'unprocessed') return !d.pagesContent;
    return true;
  });
  const { visible, hasMore, sentinelRef } = useInfiniteList(filtered);

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
        <div className={grid.grid}>
          {visible.map((doc) => {
            const uploadJob = uploadQueue.find(j => j.targetDocId === doc.id && (j.status === 'queued' || j.status === 'processing')) ?? null;
            return (
              <SpellCard
                key={doc.id}
                doc={doc}
                onClick={() => navigate(`/spell/${doc.id}`)}
                onEdit={(e) => { e.stopPropagation(); navigate(`/editor/${doc.id}`, { state: { from: location.pathname } }); }}
                onDelete={(e) => openDeleteModal(doc.id, doc.title, e)}
                // onExport={(e) => { e.stopPropagation(); openExportModal({ id: doc.id, title: doc.title }); }} // .spell export: future
                isActive={activeDocId === doc.id && (readerLoaded || audioPlaying || browserPlaying)}
                isPlaying={activeDocId === doc.id && (audioPlaying || browserPlaying)}
                onPlay={() => handlePlay(doc)}
                uploadJob={uploadJob}
                selectionMode={selectionMode}
                selected={selectedIds.includes(doc.id)}
                onToggleSelect={() => onToggleSelect?.(doc.id)}
              />
            );
          })}
        </div>
        {hasMore && <div ref={sentinelRef} data-testid="spell-list-sentinel" className={grid.sentinel} />}
      </div>
      {selectedDoc && (
        <DeleteConfirmModal
          show={showDeleteModal}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteConfirm}
          title={t.spell.deleteTitle}
          message={t.spell.deleteConfirm.replace('{title}', selectedDoc.title)}
        />
      )}
      {/* .spell export: future — re-enable the useSpellExport() hook above and this block.
      {exportTarget && (
        <SpellExportModal
          show={!!exportTarget}
          title={exportTarget.title}
          isExporting={isExporting}
          onClose={closeExportModal}
          onExport={handleExport}
        />
      )} */}
    </>
  );
};
