import s from './index.module.css';
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';
import { SpellCard } from '../../components/Cards/SpellCard';
import { SpellDetailModal, type SpellDetailOrigin } from '../../components/Modals/SpellDetailModal';
import { useCoverFrame3DSection } from '../../../hooks/useCoverFrame3DSection';
import { useLanguage } from '../../../i18n';
import { faArrowRight, faBuildingColumns } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Coverflow, type CoverflowItem } from '../../components/Coverflow/Coverflow';
import { EmptySpellCard } from '../../components/Cards/EmptySpellCard';
import { useQuickStartSpells } from '../../../hooks/useQuickStartSpells';

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

export const QuickStart: React.FC = () => {
  const { spellId: activeDocId } = useAppSelector((state) => state.spellReader);
  const uploadQueue = useAppSelector((state) => state.spellUpload.queue);
  const audioPlaying = useAppSelector((state) => state.audioPlayer.isPlaying);
  const browserPlaying = useAppSelector((state) => state.browserPlayer.isPlaying);
  const { t } = useLanguage();
  const { isLoading, empty, visible, hasMore } = useQuickStartSpells();
  const carouselWrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  // A card click opens the spell's detail in a modal (the same one the player's cover
  // opens), where all of its actions live.
  const [detailSpellId, setDetailSpellId] = useState<string | null>(null);
  const [detailOrigin, setDetailOrigin] = useState<SpellDetailOrigin | null>(null);

  // Gates 3D corners for this whole section -- passed straight to each SpellCard
  // below as show3D. See useCoverFrame3DSection/useCoverFrame3DGate for the actual
  // conditions (Mode3D user setting, desktop, !reduced-motion, low-end check, section in
  // viewport).
  const show3D = useCoverFrame3DSection(carouselWrapperRef);

  const coverflowLabels = {
    previous: t.common.previous,
    next: t.common.next,
  };

  if (!isLoading && empty) return null;

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
          // The coverflow moves, scales, dims and overlaps its cards: each 3D cover in a
          // canvas of its own follows all of that along with its card.
          own3DCanvas
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
          data-testid="quick-start-see-all"
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
            testId="quick-start"
            items={items}
            slots={SLOTS}
            itemWidth="var(--spell-card-width)"
            interactive={!isLoading}
            labels={coverflowLabels}
            renderEmpty={(key) => (isLoading ? <SkeletonCard /> : <EmptySpellCard testId={`quick-start-${key}`} />)}
          />
        </div>
      </div>
      <SpellDetailModal spellId={detailSpellId} show={detailSpellId !== null} origin={detailOrigin} onClose={() => { setDetailSpellId(null); setDetailOrigin(null); }} />
    </>
  );
};
