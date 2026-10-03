import s from './SpellDetailModal.module.css';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../../store/hooks';
import { getSpellById } from '../../../db';
import { useDeleteSpells } from '../../../hooks/useDeleteSpells';
import { useSpellCoverEditor } from '../../../hooks/useSpellCoverEditor';
import { usePlaySpell } from '../../../hooks/usePlaySpell';
import { goToNextPage, goToPreviousPage } from '../../../store/spellReaderSlice';
import { SpellTransport } from '../SpellTransport/SpellTransport';
import { coverFrames } from '../../../config/assets';
import { hasOriginalPdf } from '../../../db/originalPdfs';
import { resolveCoverFrameId, getCoverFrameStyle, getCoverFrameCorners } from '../../../utils/coverFrame';
import { CoverFrameCorners } from '../CoverFrameCorners';
import { isInCasterGrimoire } from '../../../utils/grimoire';
import { CustomModal } from './CustomModal';
import { SpellCoverModal } from './SpellCoverModal';
import { IconButton } from '../Buttons/IconButton';
import { Spinner } from '../Spinner';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { SecondaryButton } from '../Buttons/SecondaryButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpenReader, faPen, faScroll, faWandMagicSparkles, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Tag } from '../Tag/Tag';
import { useLanguage } from '../../../i18n';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { CoverFlight } from '../CoverFlight/CoverFlight';
import { useFlightTransition, type FlightOrigin } from '../Flight/useFlightTransition';

// Where the modal was opened from, when that was a spell card: its cover's place on screen
// and image, so the cover can fly from the card into the modal (and back when closing).
// The card's element is measured again when flying back: the page under the modal may have
// moved meanwhile (e.g. loading the spell turns the home page immersive).
export interface SpellDetailOrigin extends FlightOrigin {
  coverUrl: string;
  // The frame the card shows (resolved), so it flies in with the cover.
  coverFrameId?: string | null;
}

interface SpellDetailModalProps {
  spellId: string | null;
  show: boolean;
  onClose: () => void;
  origin?: SpellDetailOrigin | null;
}

export const SpellDetailModal: React.FC<SpellDetailModalProps> = ({ spellId, show, onClose, origin = null }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const { userData } = useAppSelector(state => state.session);
  const { spellId: currentPlayingId, currentPage: readerCurrentPage, totalPages: readerTotalPages, isLoaded: readerLoaded } = useAppSelector(state => state.spellReader);
  const audioPlaying = useAppSelector(state => state.audioPlayer.isPlaying);
  const browserPlaying = useAppSelector(state => state.browserPlayer.isPlaying);
  const { mountSpell, togglePlayback, unloadSpell } = usePlaySpell();
  const { activeCoverFrameId, unlockedIds } = useAppSelector(state => state.casterInventory);
  const ownedCoverFrames = useMemo(() => coverFrames.filter(frame => unlockedIds.includes(frame.id)), [unlockedIds]);

  const deleteSpells = useDeleteSpells();
  const [doc, setDoc] = useState<Awaited<ReturnType<typeof getSpellById>> | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  // A new cover image being saved (a loader over the cover modal), or a frame pick being
  // saved (a spinner on that option, the rest disabled).
  const [savingCover, setSavingCover] = useState(false);
  // An uploaded image, shown in the cover preview right away while it saves.
  const [pendingCoverUrl, setPendingCoverUrl] = useState<string | null>(null);
  const [pendingFrame, setPendingFrame] = useState<{ id: string | null | undefined } | null>(null);
  const coverEditor = useSpellCoverEditor(spellId);
  // TCORE-90: the original PDF no longer lives on the Spell record -- its existence is
  // looked up in the dedicated store instead of reading a `pdf` field.
  const [hasPdf, setHasPdf] = useState(false);

  // Opened from a card: its cover flies from the card into this modal's cover slot, and
  // back when closing. From anywhere else (the player's cover), the modal just opens.
  const { slotRef: coverSlotRef, leg, requestClose, modalMotion, flightProps } = useFlightTransition({ show, origin, onClose });

  // Every open starts clean: closing (or switching to another spell) drops what the last
  // one showed, so it never flashes the previous spell while the next loads, and a read
  // still in flight for a spell no longer shown is ignored.
  useEffect(() => {
    setDoc(null);
    setShowDeleteModal(false);
    setShowCoverModal(false);
    if (!spellId || !userData?.id || !show) return;
    let cancelled = false;
    getSpellById(spellId, userData.id).then(spell => { if (!cancelled) setDoc(spell ?? null); });
    return () => { cancelled = true; };
  }, [spellId, userData?.id, show]);

  // The card's cover bridges the moment between the spell being read and this modal's own
  // copy of its cover existing, so the cover shown while loading never blinks out.
  const shownCoverUrl = coverUrl ?? (doc?.cover && origin ? origin.coverUrl : null);

  useEffect(() => {
    if (!doc?.cover) { setCoverUrl(null); return; }
    const url = URL.createObjectURL(doc.cover);
    setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [doc?.cover]);

  useEffect(() => {
    if (!doc?.id) { setHasPdf(false); return; }
    hasOriginalPdf(doc.id).then(setHasPdf);
  }, [doc?.id]);

  // Delete (⌘+Backspace on a Mac) asks to delete this spell, as its Delete button does --
  // while this is the modal on top (not over its own confirmation or cover editor) and
  // nothing is being typed. Only for the caster's own spells (see inGrimoire below).
  const canAskDelete = show && !!spellId && !!doc && isInCasterGrimoire(doc.userId, userData?.id)
    && !showDeleteModal && !showCoverModal;
  useEffect(() => {
    if (!canAskDelete) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'Delete' || (e.metaKey && e.key === 'Backspace')) {
        e.preventDefault();
        setShowDeleteModal(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [canAskDelete]);

  if (!show || !spellId) return null;

  const resolvedCoverFrameId = doc ? resolveCoverFrameId(doc.coverFrameId, activeCoverFrameId) : null;
  const coverFrameCorners = getCoverFrameCorners(resolvedCoverFrameId);
  const pagesCount = doc?.pagesContent ? (() => { try { return JSON.parse(doc.pagesContent!).length; } catch { return null; } })() : null;
  const currentPage = (currentPlayingId === spellId && readerCurrentPage > 0)
    ? readerCurrentPage
    : (doc?.progress?.currentPage ?? 0);
  const progressPct = (pagesCount && currentPage > 0)
    ? Math.min(Math.round(currentPage / pagesCount * 100), 100)
    : null;

  // Editing and deleting are only for the caster's own transcriptions.
  const inGrimoire = !!doc && isInCasterGrimoire(doc.userId, userData?.id);

  // This spell's own playback, from here: load it into the player (paused), then play/pause
  // it and turn its pages the same way the player does.
  const mounted = currentPlayingId === spellId;
  const isPlaying = mounted && (audioPlaying || browserPlaying);

  // Only navigation: playback stays exactly as it is (the reader keeps a loaded spell
  // playing or paused, and doesn't start one that wasn't).
  const handleRead = () => {
    onClose();
    navigate(`/spell/${spellId}/reader`);
  };

  const handleEdit = () => {
    onClose();
    navigate(`/editor/${spellId}`);
  };

  // A new cover saves right away, with a loader while it does, and is read back (it
  // rewrites page 1 too).
  const saveCover = async (change: () => Promise<void>, preview?: Blob) => {
    setSavingCover(true);
    const previewUrl = preview ? URL.createObjectURL(preview) : null;
    setPendingCoverUrl(previewUrl);
    try {
      await change();
      if (spellId && userData?.id) {
        const spell = await getSpellById(spellId, userData.id);
        if (spell) setDoc(spell);
      }
    } catch (error) {
      console.error('Failed to update the cover:', error);
    } finally {
      setSavingCover(false);
      setPendingCoverUrl(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    }
  };

  // A frame is one field: saved with a spinner on the picked option, then applied here as is.
  const handlePickFrame = async (coverFrameId: string | null | undefined) => {
    setPendingFrame({ id: coverFrameId });
    try {
      await coverEditor.setFrame(coverFrameId);
      setDoc(current => (current ? { ...current, coverFrameId } : current));
    } catch (error) {
      console.error('Failed to update the cover frame:', error);
    } finally {
      setPendingFrame(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!spellId || !userData?.id) return;
    // Unloads it too, if it's the spell in the player.
    await deleteSpells([spellId]);
    setShowDeleteModal(false);
    onClose();
  };

  return (
    <>
      <CustomModal show={show} onClose={requestClose} title="" compact motion={modalMotion}>
        {!doc ? (
          // Still reading the spell: the modal already has its final size -- the header is as
          // tall as the cover, and the actions row is here with what needs no spell read
          // (Edit/Delete join it in the same row) -- so nothing moves when the details arrive.
          // Opened from a card, its cover is already here too: it's what flies in, and it
          // stays once landed.
          <div className={s.content}>
            <div className={s.header}>
              <div ref={coverSlotRef} data-testid="spell-detail-modal-cover" className={`${s.coverWrap} ${leg ? s.coverAway : ''}`}>
                {origin
                  ? <img src={origin.coverUrl} alt="" className={`${s.cover} ${getCoverFrameCorners(origin.coverFrameId ?? null) ? s.coverSquared : ''}`} />
                  : <div className={s.coverPlaceholder}><FontAwesomeIcon icon={faScroll} /></div>}
              </div>
              <div data-testid="spell-detail-modal-loading" className={`${s.info} ${s.loading}`}>
                <Spinner isLoading message={t.common.loading} />
              </div>
            </div>
            <div className={s.actions}>
              <PrimaryButton data-testid="spell-detail-modal-continue-btn" icon={faBookOpenReader} onClick={handleRead}>{t.spell.openInReader}</PrimaryButton>
            </div>
          </div>
        ) : (
          <div className={s.content}>
            <div className={s.header}>
              <div ref={coverSlotRef} data-testid="spell-detail-modal-cover" className={`${s.coverWrap} ${leg ? s.coverAway : ''}`}>
                {shownCoverUrl
                  ? <img src={shownCoverUrl} alt={doc.title} className={`${s.cover} ${coverFrameCorners ? s.coverSquared : ''}`} style={getCoverFrameStyle(resolvedCoverFrameId)} />
                  : <div className={s.coverPlaceholder}><FontAwesomeIcon icon={faScroll} /></div>
                }
                {shownCoverUrl && coverFrameCorners && <CoverFrameCorners config={coverFrameCorners} />}
                {/* Shown on hover: the cover and its frame, for the caster's own spells. */}
                {inGrimoire && (
                  <IconButton
                    data-testid="spell-detail-modal-edit-cover-btn"
                    icon={faPen}
                    title={t.spell.editCover}
                    className={s.coverEditButton}
                    onClick={() => setShowCoverModal(true)}
                  />
                )}
              </div>
              <div className={s.info}>
                <h2 className={s.title}>
                  {/* The full detail lives on its own route; the modal steps aside for it. */}
                  <Link
                    data-testid="spell-detail-modal-title-link"
                    className={s.titleLink}
                    to={`/spell/${spellId}`}
                    title={t.spell.viewFullDetail}
                    onClick={onClose}
                  >
                    {doc.title}
                  </Link>
                </h2>
                {doc.author && <p data-testid="spell-detail-modal-author" className={s.author}>{doc.author}</p>}
                <div className={s.tags}>
                  {hasPdf && <span data-testid="spell-detail-modal-pdf-tag"><Tag tone="default" size="sm">PDF</Tag></span>}
                  {currentPage > 0 && progressPct !== null && (
                    <Tag tone={progressPct === 100 ? 'ok' : 'primary'} size="sm">
                      {progressPct}%
                    </Tag>
                  )}
                  {!doc.pagesContent && <Tag tone="warning" size="sm">Unprocessed</Tag>}
                </div>
                <p className={s.meta}>{new Date(doc.createdAt).toLocaleDateString()}</p>
                <SpellTransport
                  leading={pagesCount ? <p className={s.meta}>{pagesCount} {pagesCount === 1 ? t.spell.pageSingular : t.spell.pagePlural}</p> : null}
                  mounted={mounted}
                  isPlaying={isPlaying}
                  canPrevious={mounted && readerLoaded && readerCurrentPage > 1}
                  canNext={mounted && readerLoaded && readerCurrentPage < readerTotalPages}
                  onMount={() => mountSpell(doc)}
                  onUnmount={() => unloadSpell()}
                  onTogglePlay={togglePlayback}
                  onPrevious={() => dispatch(goToPreviousPage())}
                  onNext={() => dispatch(goToNextPage())}
                  labels={{
                    mount: t.player.mountSpell,
                    unmount: t.player.unloadSpell,
                    play: t.player.play,
                    pause: t.player.pause,
                    previous: t.player.previous,
                    next: t.player.next,
                  }}
                />
                {progressPct !== null && (
                  <div className={s.progressBar}>
                    <div className={s.progressFill} style={{ width: `${progressPct}%` }} />
                  </div>
                )}
                {currentPage > 0 && pagesCount && (
                  <p className={s.progressText}>{t.spell.page} {currentPage} {t.spell.of} {pagesCount}</p>
                )}
                {/* Language and tags are left to the spell's full detail page. */}
                {doc.description && (
                  <div className={s.metadata} data-testid="spell-detail-modal-metadata">
                    <p className={s.metadataDescription} data-testid="spell-detail-modal-description">{doc.description}</p>
                  </div>
                )}
              </div>
            </div>
            <div className={s.actions}>
              <PrimaryButton data-testid="spell-detail-modal-continue-btn" icon={faBookOpenReader} onClick={handleRead}>{t.spell.openInReader}</PrimaryButton>
              {inGrimoire && (
                <>
                  <SecondaryButton data-testid="spell-detail-modal-edit-btn" icon={faWandMagicSparkles} onClick={handleEdit}>{t.spell.editSpell}</SecondaryButton>
                  <PrimaryButton data-testid="spell-detail-modal-delete-btn" variant="danger" icon={faTrash} onClick={() => setShowDeleteModal(true)}>{t.common.delete}</PrimaryButton>
                </>
              )}
            </div>
          </div>
        )}
      </CustomModal>
      {leg && flightProps && origin && (
        <CoverFlight
          // A new flight per leg: closing while the cover is still flying in turns it back
          // from where it is, instead of finishing the way in first.
          key={leg.direction}
          {...flightProps}
          // Back with the cover and frame it has now: they may have been changed meanwhile.
          src={leg.direction === 'out' ? coverUrl ?? origin.coverUrl : origin.coverUrl}
          frameId={leg.direction === 'out' && doc ? resolvedCoverFrameId : origin.coverFrameId ?? null}
          // Arriving in the modal it turns over once, showing the app's mark on its back.
          spin={leg.direction === 'in'}
        />
      )}
      <SpellCoverModal
        show={showCoverModal}
        onClose={() => setShowCoverModal(false)}
        coverUrl={pendingCoverUrl ?? coverUrl}
        savingCover={savingCover}
        onUploadImage={(file) => void saveCover(() => coverEditor.setCoverFromImage(file), file)}
        onUseFirstPage={hasPdf ? () => void saveCover(coverEditor.setCoverFromPdf) : undefined}
        frames={ownedCoverFrames}
        frameId={doc?.coverFrameId}
        onPickFrame={(id) => void handlePickFrame(id)}
        pendingFrame={pendingFrame}
      />
      <DeleteConfirmModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title={t.spell.deleteTitle}
        message={t.spell.deleteConfirm.replace('{title}', doc?.title ?? '')}
      />
    </>
  );
};
