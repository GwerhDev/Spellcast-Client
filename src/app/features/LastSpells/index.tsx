import s from './index.module.css';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getSpellsFromDB, deleteSpellFromDB } from '../../../db';
import { useNavigate, useLocation } from 'react-router-dom';
import { DeleteConfirmModal } from '../../components/Modals/DeleteConfirmModal';
// import { SpellExportModal } from '../../components/Modals/SpellExportModal'; // .spell export: future
import { useAppSelector } from '../../../store/hooks';
import { Spell } from '../../../interfaces';
import { SpellCard } from '../../components/Cards/SpellCard';
import { resolveCoverFrameId, getCoverFrameCorners, getCoverFrame3D } from '../../../utils/coverFrame';
import { useCoverFrame3DGate } from '../../../hooks/useCoverFrame3DGate';
import type { CardFrameAnchor } from '../../components/Cover3D/CoverFrame3DOverlay';

// three/@react-three/fiber are only downloaded once the 3D gate actually passes (Mode3D
// user setting on, desktop, motion ok, section in view) -- lazy so everyone else's Last
// Spells bundle stays free of the 3D stack, same reasoning as SpellReader's own lazy
// CompanionOverlay import.
const CoverFrame3DOverlay = React.lazy(() =>
  import('../../components/Cover3D/CoverFrame3DOverlay').then(m => ({ default: m.CoverFrame3DOverlay }))
);
// import { useSpellExport } from '../../../hooks/useSpellExport'; // .spell export: future
import { useDispatch } from 'react-redux';
import { setAutoPlayOnLoad, resetBrowserPlayer, requestTogglePlay } from '../../../store/browserPlayerSlice';
import { setAutoPlayOnLoad as setAudioAutoPlayOnLoad, resetAudioPlayer, requestTogglePlay as requestAudioTogglePlay } from '../../../store/audioPlayerSlice';
import { setSpellFile, setSpellInfo, resetSpellReader } from '../../../store/spellReaderSlice';
import { useLanguage } from '../../../i18n';
import { faArrowRight, faBuildingColumns, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconButton } from '../../components/Buttons/IconButton';

export const LastSpells: React.FC = () => {
  const { userData } = useAppSelector((state) => state.session);
  const { spellId: activeDocId, currentPage: activeCurrentPage, isLoaded: readerLoaded, listVersion } = useAppSelector((state) => state.spellReader);
  const uploadQueue = useAppSelector((state) => state.spellUpload.queue);
  const audioPlaying = useAppSelector((state) => state.audioPlayer.isPlaying);
  const browserPlaying = useAppSelector((state) => state.browserPlayer.isPlaying);
  const selectedVoiceType = useAppSelector((state) => state.voice.selectedVoice.type);
  const { activeCoverFrameId } = useAppSelector((state) => state.casterInventory);
  const { t } = useLanguage();
  const [documents, setDocuments] = useState<Spell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ id: string, title: string } | null>(null);
  // .spell export UI is hidden for now (not ready to ship this phase) — kept wired but
  // commented out so it's a one-line re-enable later. See onExport below and the
  // SpellExportModal render at the bottom of this file.
  // const { exportTarget, openExportModal, closeExportModal, handleExport, isExporting } = useSpellExport();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const carouselWrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  // TCORE-124: gates the single shared 3D overlay for the whole section (see
  // useCoverFrame3DGate for what each condition guards against, including the user's own
  // Mode3D toggle in Appearance settings). Measured against .carouselWrapper (not .slider)
  // so the IntersectionObserver isn't confused by the slider's own horizontal scroll -- the
  // wrapper's visibility is purely a vertical-scroll question, which is what "is this
  // section on screen" actually means here.
  const show3DFrames = useCoverFrame3DGate(carouselWrapperRef);

  const updateButtons = useCallback(() => {
    const el = sliderRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const scroll = (dir: 'prev' | 'next') => {
    const el = sliderRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'next' ? 280 : -280, behavior: 'smooth' });
  };

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

  const fetchSpells = async () => {
    try {
      setIsLoading(true);
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

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    updateButtons();
    el.addEventListener('scroll', updateButtons);
    const ro = new ResizeObserver(updateButtons);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateButtons); ro.disconnect(); };
  }, [documents, updateButtons]);

  useEffect(() => {
    if (!activeDocId || !activeCurrentPage) return;
    setDocuments(prev => prev.map(doc =>
      doc.id === activeDocId
        ? { ...doc, progress: { currentPage: activeCurrentPage, pagesProgress: doc.progress?.pagesProgress ?? [], lastReadSentenceIndex: doc.progress?.lastReadSentenceIndex ?? 0 } }
        : doc
    ));
  }, [activeCurrentPage, activeDocId]);

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
    if (selectedDoc) {
      try {
        await deleteSpellFromDB(selectedDoc.id, userData.id);
        fetchSpells();
      } catch (error) {
        console.error('Failed to delete spell:', error);
      } finally {
        closeDeleteModal();
      }
    }
  };

  if (isLoading) return (
    <div className={s.container}>
      <div className={s.header}>
        <h2 className={s.title}>{t.nav.lastSpells}</h2>
      </div>
      <div className={s.slider}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={s.skeletonCard} data-testid="skeleton-card">
            <div className={`${s.skeletonCover} ${s.skeletonLine}`} />
            <div className={s.skeletonFooter}>
              <div className={`${s.skeletonLine} ${s.skeletonTitle}`} />
              <div className={`${s.skeletonLine} ${s.skeletonTitleShort}`} />
              <div className={`${s.skeletonLine} ${s.skeletonDate}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  if (documents.length === 0) return null;

  const MAX = 10;
  const visible = documents.slice(0, MAX);
  const hasMore = documents.length > MAX;
  // TCORE-123 follow-up: the carousel's own padding (see .slider's own comment) exists
  // only to keep a cover frame's overhanging corners from being clipped by this scroller's
  // overflow -- when nothing visible actually has a frame, that padding is just dead space
  // above/around the cards, so it's applied conditionally rather than unconditionally.
  const hasVisibleCoverFrame = visible.some(doc => !!getCoverFrameCorners(resolveCoverFrameId(doc.coverFrameId, activeCoverFrameId)));

  // TCORE-124: which visible cards resolve to a frame that also has 3D geometry
  // (getCoverFrame3D) -- only those get an anchor, everything else keeps the plain 2D
  // CoverFrameCorners SpellCard already renders. getRect is a closure (not a stored value)
  // so CoverFrame3DOverlay always reads the CURRENT position, including mid-scroll -- doc.id
  // matches SpellCard's own data-testid, so no ref/prop needs to be threaded into SpellCard
  // for this to find it, keeping SpellCard itself untouched.
  const frame3DAnchors: CardFrameAnchor[] = show3DFrames
    ? visible.reduce<CardFrameAnchor[]>((acc, doc) => {
        const config = getCoverFrame3D(resolveCoverFrameId(doc.coverFrameId, activeCoverFrameId));
        if (!config) return acc;
        acc.push({
          id: doc.id,
          config,
          getRect: () => {
            const card = sliderRef.current?.querySelector(`[data-testid="spell-card-${doc.id}"]`);
            // Matches the 2D CoverFrameCorners' own anchor box exactly (see its comment in
            // CoverFrameCorners.tsx) -- the cover art itself, not the whole card (which also
            // includes the title/date footer below it).
            return card ? card.querySelector('[class*="coverWrapper"]')?.getBoundingClientRect() ?? null : null;
          },
        });
        return acc;
      }, [])
    : [];

  return (
    <>
      <div className={s.container}>
        <div className={s.header}>
          <h2 className={s.title}>{t.nav.lastSpells}</h2>
          <span className={s.grimoireLink} onClick={() => navigate('/grimoire')}>
            <FontAwesomeIcon icon={faBuildingColumns} />
            {t.nav.grimoire}
            <FontAwesomeIcon icon={faArrowRight} />
          </span>
        </div>
        <div className={s.carouselWrapper} ref={carouselWrapperRef}>
          {canPrev && (
            <IconButton icon={faChevronLeft} variant="transparent" className={`${s.navBtn} ${s.navBtnPrev}`} onClick={() => scroll('prev')} />
          )}
          <div className={`${s.slider} ${hasVisibleCoverFrame ? s.sliderFramed : ''}`} ref={sliderRef}>
            {visible.map((doc) => {
              const uploadJob = uploadQueue.find(j => j.targetDocId === doc.id && (j.status === 'queued' || j.status === 'processing')) ?? null;
              return (
                <SpellCard
                  key={doc.id}
                  doc={doc}
                  isActive={activeDocId === doc.id && (readerLoaded || audioPlaying || browserPlaying)}
                  isPlaying={activeDocId === doc.id && (audioPlaying || browserPlaying)}
                  onClick={() => navigate(`/spell/${doc.id}`)}
                  onEdit={(e) => { e.stopPropagation(); navigate(`/editor/${doc.id}`, { state: { from: location.pathname } }); }}
                  onDelete={(e) => openDeleteModal(doc.id, doc.title, e)}
                  // onExport={(e) => { e.stopPropagation(); openExportModal({ id: doc.id, title: doc.title }); }} // .spell export: future
                  onPlay={() => handlePlay(doc)}
                  uploadJob={uploadJob}
                />
              );
            })}
            {hasMore && (
              <div className={s.seeAllCard} onClick={() => navigate('/grimoire')}>
                <FontAwesomeIcon icon={faArrowRight} />
                <span>{t.nav.grimoire}</span>
              </div>
            )}
          </div>
          {canNext && (
            <IconButton icon={faChevronRight} variant="transparent" className={`${s.navBtn} ${s.navBtnNext}`} onClick={() => scroll('next')} />
          )}
          {/* TCORE-124: mounted only once useCoverFrame3DGate passes -- frame3DAnchors is
              empty otherwise, but the component itself (and its lazy three.js chunk) isn't
              even requested unless show3DFrames is true, so a users-with-3D-off session
              never pays for the import. Absolutely positioned over the whole wrapper (not
              just .slider) so its canvas covers nav buttons too -- pointer-events: none on
              the canvas itself (see CoverFrame3DOverlay) keeps them clickable regardless. */}
          {show3DFrames && (
            <React.Suspense fallback={null}>
              <CoverFrame3DOverlay containerRef={carouselWrapperRef} anchors={frame3DAnchors} />
            </React.Suspense>
          )}
        </div>
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
