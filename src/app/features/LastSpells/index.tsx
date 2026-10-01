import s from './index.module.css';
import React, { useEffect, useState, useRef } from 'react';
import { getSpellsFromDB } from '../../../db';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import { Spell } from '../../../interfaces';
import { SpellCard } from '../../components/Cards/SpellCard';
import { SpellDetailModal, type SpellDetailOrigin } from '../../components/Modals/SpellDetailModal';
import { useCoverFrame3DSection } from '../../../hooks/useCoverFrame3DSection';
import { useLanguage } from '../../../i18n';
import { faArrowRight, faBuildingColumns } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Coverflow, type CoverflowItem } from '../../components/Coverflow/Coverflow';
import { EmptySpellCard } from '../../components/Cards/EmptySpellCard';

// The places the row always shows: a spell in the middle and three on each side, filled
// with empty ones when there are fewer spells.
const SLOTS = 7;

const SkeletonCard = () => (
  <div className={s.skeletonCard} data-testid="skeleton-card">
    <div className={`${s.skeletonCover} ${s.skeletonLine}`} />
    <div className={s.skeletonFooter}>
      <div className={`${s.skeletonLine} ${s.skeletonTitle}`} />
      <div className={`${s.skeletonLine} ${s.skeletonTitleShort}`} />
      <div className={`${s.skeletonLine} ${s.skeletonDate}`} />
    </div>
  </div>
);

export const LastSpells: React.FC = () => {
  const { userData } = useAppSelector((state) => state.session);
  const { spellId: activeDocId, currentPage: activeCurrentPage, listVersion, coverFrameChange } = useAppSelector((state) => state.spellReader);
  const uploadQueue = useAppSelector((state) => state.spellUpload.queue);
  const audioPlaying = useAppSelector((state) => state.audioPlayer.isPlaying);
  const browserPlaying = useAppSelector((state) => state.browserPlayer.isPlaying);
  const { t } = useLanguage();
  const [documents, setDocuments] = useState<Spell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const carouselWrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  // A card click opens the spell's detail in a modal (the same one the player's cover
  // opens), where all of its actions live.
  const [detailSpellId, setDetailSpellId] = useState<string | null>(null);
  const [detailOrigin, setDetailOrigin] = useState<SpellDetailOrigin | null>(null);

  // TCORE-124: gates 3D corners for this whole section -- passed straight to each SpellCard
  // below as show3D. See useCoverFrame3DSection/useCoverFrame3DGate for the actual
  // conditions (Mode3D user setting, desktop, !reduced-motion, low-end check, section in
  // viewport).
  const show3D = useCoverFrame3DSection(carouselWrapperRef);


  const fetchSpells = async () => {
    try {
      // No going back to the loading state on a refetch (isLoading starts true, for the
      // first load only): the skeleton replaces everything this renders, including the
      // open detail modal, which would close and reopen on every change saved from it.
      const docs = await getSpellsFromDB(userData.id);
      setDocuments(docs.sort((a: Spell, b: Spell) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Failed to fetch local spells:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpells();
    //eslint-disable-next-line
  }, [userData.id, listVersion]);

  // A cover frame picked from the detail: applied to that card in place, no refetch.
  useEffect(() => {
    if (!coverFrameChange) return;
    const { spellId: changedId, coverFrameId } = coverFrameChange;
    setDocuments(prev => prev.map(doc => (doc.id === changedId ? { ...doc, coverFrameId } : doc)));
  }, [coverFrameChange]);

  useEffect(() => {
    if (!activeDocId || !activeCurrentPage) return;
    setDocuments(prev => prev.map(doc =>
      doc.id === activeDocId
        ? { ...doc, progress: { currentPage: activeCurrentPage, pagesProgress: doc.progress?.pagesProgress ?? [], lastReadSentenceIndex: doc.progress?.lastReadSentenceIndex ?? 0 } }
        : doc
    ));
  }, [activeCurrentPage, activeDocId]);

  const MAX = 10;
  const visible = documents.slice(0, MAX);
  const hasMore = documents.length > MAX;

  const coverflowLabels = {
    previous: t.common.previous,
    next: t.common.next,
  };

  if (!isLoading && documents.length === 0) return null;

  // Loading, the row is already there, in skeletons: the same row the spells then fill in
  // place, so it spreads out once instead of again when they arrive.
  const items: CoverflowItem[] = isLoading ? [] : visible.map((doc) => {
    const uploadJob = uploadQueue.find(j => j.targetDocId === doc.id && (j.status === 'queued' || j.status === 'processing')) ?? null;
    return {
      key: doc.id,
      node: ({ front }) => (
        <SpellCard
          focusable={front}
          doc={doc}
          isActive={activeDocId === doc.id}
          isPlaying={activeDocId === doc.id && (audioPlaying || browserPlaying)}
          onClick={(origin) => { setDetailOrigin(origin ?? null); setDetailSpellId(doc.id); }}
          lifted={detailSpellId === doc.id && !!detailOrigin}
          uploadJob={uploadJob}
          show3D={show3D}
        />
      ),
    };
  });
  if (!isLoading && hasMore) {
    items.push({
      key: 'see-all',
      node: ({ front }) => (
        <div
          className={s.seeAllCard}
          data-testid="last-spells-see-all"
          role="link"
          tabIndex={front ? 0 : -1}
          onClick={() => navigate('/grimoire')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/grimoire'); } }}
        >
          <FontAwesomeIcon icon={faBuildingColumns} />
          <span>{t.nav.grimoire}</span>
        </div>
      ),
    });
  }

  return (
    <>
      <div className={s.container}>
        <div className={s.header}>
          <span className={s.grimoireLink} onClick={() => navigate('/grimoire')}>
            <FontAwesomeIcon icon={faBuildingColumns} />
            {t.nav.grimoire}
            <FontAwesomeIcon icon={faArrowRight} />
          </span>
        </div>
        <div className={s.carouselWrapper} ref={carouselWrapperRef}>
          <Coverflow
            testId="last-spells"
            items={items}
            slots={SLOTS}
            itemWidth="var(--spell-card-width)"
            interactive={!isLoading}
            labels={coverflowLabels}
            renderEmpty={(key) => (isLoading ? <SkeletonCard /> : <EmptySpellCard testId={`last-spells-${key}`} />)}
          />
        </div>
      </div>
      <SpellDetailModal spellId={detailSpellId} show={detailSpellId !== null} origin={detailOrigin} onClose={() => { setDetailSpellId(null); setDetailOrigin(null); }} />
    </>
  );
};
