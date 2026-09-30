import s from './SpellDetailModal.module.css';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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

interface SpellDetailModalProps {
  spellId: string | null;
  show: boolean;
  onClose: () => void;
}

export const SpellDetailModal: React.FC<SpellDetailModalProps> = ({ spellId, show, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const coverEditor = useSpellCoverEditor(spellId);
  // TCORE-90: the original PDF no longer lives on the Spell record -- its existence is
  // looked up in the dedicated store instead of reading a `pdf` field.
  const [hasPdf, setHasPdf] = useState(false);

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
    navigate(`/editor/${spellId}`, { state: { from: location.pathname } });
  };

  // Cover and frame changes save right away; the spell is read again so this modal shows
  // them too (the lists refresh on their own).
  const withReload = (change: () => Promise<void>) => async () => {
    try {
      await change();
    } catch (error) {
      console.error('Failed to update the cover:', error);
    }
    if (!spellId || !userData?.id) return;
    const spell = await getSpellById(spellId, userData.id);
    if (spell) setDoc(spell);
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
      <CustomModal show={show} onClose={onClose} title="" compact>
        {!doc ? (
          <div data-testid="spell-detail-modal-loading" className={s.loading}>
            <Spinner isLoading message={t.common.loading} />
          </div>
        ) : (
          <div className={s.content}>
            <div className={s.header}>
              <div data-testid="spell-detail-modal-cover" className={s.coverWrap}>
                {coverUrl
                  ? <img src={coverUrl} alt={doc.title} className={s.cover} style={getCoverFrameStyle(resolvedCoverFrameId)} />
                  : <div className={s.coverPlaceholder}><FontAwesomeIcon icon={faScroll} /></div>
                }
                {coverUrl && coverFrameCorners && <CoverFrameCorners config={coverFrameCorners} />}
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
                  onUnmount={unloadSpell}
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
                {(doc.description || doc.language || doc.tags?.length) ? (
                  <div className={s.metadata} data-testid="spell-detail-modal-metadata">
                    {doc.description && (
                      <p className={s.metadataDescription} data-testid="spell-detail-modal-description">{doc.description}</p>
                    )}
                    {doc.language && (
                      <div className={s.metadataRow}>
                        <span data-testid="spell-detail-modal-language">
                          <strong>{t.spell.languageLabel}:</strong> {doc.language}
                        </span>
                      </div>
                    )}
                    {!!doc.tags?.length && (
                      <div className={s.metadataTags} data-testid="spell-detail-modal-tags">
                        {doc.tags.map((tag) => <Tag key={tag} tone="default" size="sm">{tag}</Tag>)}
                      </div>
                    )}
                  </div>
                ) : null}
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
      <SpellCoverModal
        show={showCoverModal}
        onClose={() => setShowCoverModal(false)}
        coverUrl={coverUrl}
        onUploadImage={(file) => void withReload(() => coverEditor.setCoverFromImage(file))()}
        onUseFirstPage={hasPdf ? () => void withReload(coverEditor.setCoverFromPdf)() : undefined}
        frames={ownedCoverFrames}
        frameId={doc?.coverFrameId}
        onPickFrame={(id) => void withReload(() => coverEditor.setFrame(id))()}
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
