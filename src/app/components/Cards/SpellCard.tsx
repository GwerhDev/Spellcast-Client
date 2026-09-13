import s from './SpellCard.module.css';
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faScroll, faTrash, faPen, faEllipsisVertical, faHourglassHalf, faCheck, faFileExport, faImage } from '@fortawesome/free-solid-svg-icons';
import { Spell } from '../../../interfaces';
import { useLanguage } from '../../../i18n';
import { Tag } from '../Tag/Tag';
import { Waveform } from '../Waveform/Waveform';
import { PlayButton } from '../PlayButton/PlayButton';
import { useAppSelector } from '../../../store/hooks';
import { resolveCoverFrameId, getCoverFrameStyle, getCoverFrameCorners, getCoverFrame3D } from '../../../utils/coverFrame';
import { CoverFrameCorners } from '../CoverFrameCorners';
import { VIEW_MARGIN_X, VIEW_MARGIN_Y } from '../Cover3D/constants';
import { coverFrames } from '../../../config/assets';
import { CoverFramePickerModal } from '../Modals/CoverFramePickerModal';
import { updateSpellCoverFrame } from '../../../db';

// TCORE-124: three/@react-three/fiber/@react-three/drei are only downloaded once a card
// actually renders this (i.e. show3D is true for it) -- lazy so SpellCard, used on nearly
// every route, doesn't statically pull the whole 3D stack into the main bundle regardless
// of whether Mode3D is even on. Confirmed the hard way: a non-lazy import here inflated the
// main chunk by ~900kB even with CoverFrame3DRoot itself already lazy elsewhere -- SpellCard
// is what actually touches nearly every route, so IT has to be the lazy boundary.
const CoverFrame3DView = React.lazy(() =>
  import('../Cover3D/CoverFrame3DView').then(m => ({ default: m.CoverFrame3DView }))
);

interface UploadJob {
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: { current: number; total: number } | null;
}

interface SpellCardProps {
  doc: Spell;
  isActive?: boolean;
  isPlaying?: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onExport?: (e: React.MouseEvent) => void;
  onPlay?: (e: React.MouseEvent) => void;
  uploadJob?: UploadJob | null;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  // TCORE-124: true once the caller's own gate (Mode3D user setting + desktop +
  // !reduced-motion + this card in viewport, see useCoverFrame3DGate) says this specific
  // card should get 3D corners instead of the flat 2D CoverFrameCorners. Undefined/false
  // keeps today's plain 2D behavior -- a caller that never passes this literally cannot
  // change (LastSpells/SpellList opt in explicitly, everything else keeps working exactly
  // as before untouched).
  show3D?: boolean;
}

export const SpellCard = ({ doc, isActive, isPlaying, onClick, onDelete, onEdit, onExport, onPlay, uploadJob, selectionMode, selected, onToggleSelect, show3D }: SpellCardProps) => {
  const { t } = useLanguage();
  const totalPages = useMemo(() => {
    if (!doc.pagesContent) return null;
    try { return JSON.parse(doc.pagesContent).length; } catch { return null; }
  }, [doc.pagesContent]);

  // TCORE-123: this spell's own pick, falling back to the global default when unset.
  // Mirrored into local state (like coverUrl below) so picking a new frame from this card's
  // own context menu updates immediately without the parent (SpellList/LastSpells) having
  // to refetch its whole `documents` list just for this one field.
  const { activeCoverFrameId, unlockedIds } = useAppSelector(state => state.casterInventory);
  const [coverFrameId, setCoverFrameId] = useState(doc.coverFrameId);
  useEffect(() => { setCoverFrameId(doc.coverFrameId); }, [doc.coverFrameId]);
  const resolvedCoverFrameId = resolveCoverFrameId(coverFrameId, activeCoverFrameId);
  const coverFrameStyle = getCoverFrameStyle(resolvedCoverFrameId);
  const coverFrameCorners = getCoverFrameCorners(resolvedCoverFrameId);
  // TCORE-124: only looked up (and only rendered below) when the caller's own gate says
  // this card should render its corners in 3D -- getCoverFrame3D returns null both when
  // show3D is false AND when this resolved frame has no 3D geometry at all, so a frame
  // without a 3D asset yet still falls back to the plain 2D corners even with 3D enabled.
  const coverFrame3D = show3D ? getCoverFrame3D(resolvedCoverFrameId) : null;
  const ownedCoverFrames = useMemo(() => coverFrames.filter(b => unlockedIds.includes(b.id)), [unlockedIds]);
  const [showCoverFrameModal, setShowCoverFrameModal] = useState(false);

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!doc.cover) return;
    const url = URL.createObjectURL(doc.cover);
    setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [doc.cover]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left });
    setMenuOpen(o => !o);
  };

  const currentPage = doc.progress?.currentPage ?? 0;
  const progressPct = (totalPages && currentPage > 0)
    ? Math.min(Math.round(currentPage / totalPages * 100), 100)
    : null;

  const handleClick = () => {
    if (selectionMode) { onToggleSelect?.(); return; }
    onClick();
  };

  // TCORE-123: `pick` mirrors Spell.coverFrameId's own three states -- undefined clears
  // this spell's override (back to following the global default), null explicitly opts
  // this spell out of one, and a frame id is this spell's own explicit pick. Applied
  // optimistically to local state immediately, then persisted -- reverted only if the
  // write itself fails, so a slow IndexedDB write never leaves the picker feeling stuck.
  const handleCoverFramePick = async (pick: string | null | undefined) => {
    setShowCoverFrameModal(false);
    const previous = coverFrameId;
    setCoverFrameId(pick);
    try {
      await updateSpellCoverFrame(doc.id, doc.userId!, pick);
    } catch (err) {
      console.error('Failed to save cover frame:', err);
      setCoverFrameId(previous);
    }
  };

  const hasCoverFrame = !!(coverUrl && coverFrameCorners);

  return (
    <>
    <div
      data-testid={`spell-card-${doc.id}`}
      className={`${s.card} ${isActive ? s.cardActive : ''} ${selected ? s.cardSelected : ''} ${hasCoverFrame ? s.cardSquared : ''}`}
      onClick={handleClick}
    >
      {/* TCORE-123 follow-up: everything that needs to respect .card's own rounded
          corners (or that positions itself with inset:0 expecting to be clipped, like the
          upload overlay/hover scrim/sliding footer) lives inside this inner clip wrapper.
          CoverFrameCorners is the one exception -- it's a sibling of this wrapper, a direct
          child of the unclipped .card, specifically so its corner plates and medallions can
          overhang the cover's own edge instead of being cut off by the card's overflow. */}
      <div className={`${s.cardClip} ${hasCoverFrame ? s.cardClipSquared : ''}`}>
        {selectionMode && (
          <div className={s.selectionOverlay}>
            <span className={`${s.checkbox} ${selected ? s.checkboxSelected : ''}`}>
              {selected && <FontAwesomeIcon icon={faCheck} style={{ fontSize: '0.6rem', color: '#0a0c10' }} />}
            </span>
          </div>
        )}
        <div className={`${s.actions} ${menuOpen ? s.actionsVisible : ''}`}>
          <button ref={btnRef} data-testid={`spell-card-menu-btn-${doc.id}`} className={s.menuButton} onClick={openMenu}>
            <FontAwesomeIcon icon={faEllipsisVertical} />
          </button>
        </div>
        {menuOpen && createPortal(
          <div
            ref={menuRef}
            className={s.contextMenu}
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button className={s.menuItem} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(e); }}>
              <FontAwesomeIcon icon={faPen} />
              {t.common.edit}
            </button>
            {onExport && (
              <button data-testid={`spell-card-export-${doc.id}`} className={s.menuItem} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onExport(e); }}>
                <FontAwesomeIcon icon={faFileExport} />
                {t.spell.exportSpell}
              </button>
            )}
            {/* TCORE-123: always shown, regardless of ownership -- the picker itself lists
                whatever IS owned (including "no frame owned yet" as an empty state), rather
                than this menu item deciding upfront whether there's anything to pick. */}
            <button data-testid={`spell-card-cover-frame-${doc.id}`} className={s.menuItem} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setShowCoverFrameModal(true); }}>
              <FontAwesomeIcon icon={faImage} />
              {t.spell.coverFrameLabel}
            </button>
            <button className={`${s.menuItem} ${s.menuItemDanger}`} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(e); }}>
              <FontAwesomeIcon icon={faTrash} />
              {t.common.delete}
            </button>
          </div>,
          document.body
        )}
        {onPlay && !selectionMode && (
          <div className={`${s.playAction} ${isPlaying ? s.playActionPlaying : isActive ? s.playActionActive : ''}`}>
            <PlayButton
              size="sm"
              isPlaying={!!isPlaying}
              onClick={(e) => { e.stopPropagation(); onPlay(e); }}
            />
          </div>
        )}
        <div className={s.coverWrapper}>
          {coverUrl
            ? <img src={coverUrl} alt={doc.title} className={s.cover} style={coverFrameStyle} />
            : <div className={s.iconWrapper}><FontAwesomeIcon icon={faScroll} className={s.icon} /></div>
          }
          <div className={s.coverTags}>
            {isPlaying && <Tag tone="live" size="sm" dot>{t.spell.reading}</Tag>}
            {isActive && !isPlaying && <Tag tone="primary" size="sm">{t.spell.reading}</Tag>}
          </div>
          {uploadJob && (
            <div className={s.uploadOverlay}>
              {uploadJob.status === 'processing' ? (
                <>
                  <div className={s.uploadSpinnerRing} />
                  <span className={s.uploadPct}>
                    {uploadJob.progress
                      ? `${Math.round(uploadJob.progress.current / uploadJob.progress.total * 100)}%`
                      : '…'}
                  </span>
                </>
              ) : (
                <FontAwesomeIcon icon={faHourglassHalf} className={s.uploadPendingIcon} />
              )}
            </div>
          )}
        </div>
        <div className={s.footer}>
          <div className={s.titleRow}>
            <span className={s.title}>{doc.title}</span>
            {isPlaying && <Waveform active bars={3} height={10} />}
          </div>
          {progressPct !== null ? (
            <div className={s.progressBar}>
              <div className={s.progressFill} style={{ width: `${progressPct}%` }} />
            </div>
          ) : (
            <small className={s.date}>{new Date(doc.createdAt).toLocaleDateString()}</small>
          )}
          {currentPage > 0 && (
            <small className={s.progress}>
              p. {currentPage}{totalPages ? ` / ${totalPages}` : ''}
            </small>
          )}
        </div>
      </div>
      {/* Positioned relative to .coverWrapper's own box (see CoverFrameCorners' own
          comment) but living outside .cardClip so its pieces can overhang the cover's edge
          instead of being clipped by the card's rounded-corner overflow. TCORE-124:
          CoverFrame3DView replaces CoverFrameCorners entirely when 3D is active for this
          card (not layered on top of it) -- it IS the tracked element (drei's <View>, see
          its own comment for why it can't be wrapped in a separate externally-measured
          div), sized/positioned exactly like .coverFrameOverlay via the same className, so
          its 3D corners occupy the identical slot the 2D ones would have. --cover-frame-3d-
          margin only set for the 3D case: it grows .coverFrameSlot's own box on every side
          (see that CSS rule's own comment) so the <View>'s WebGL scissor rect has room for
          its corners' overhang without .cardClip's overflow:hidden cutting it off -- the 2D
          CoverFrameCorners mechanism doesn't need this margin (each of its <img> tags
          overhangs its own single edge independently, with no shared bounding box). */}
      {hasCoverFrame && (
        <div className={s.coverFrameSlot} style={coverFrame3D ? ({ '--cover-frame-3d-margin-x': `${VIEW_MARGIN_X}px`, '--cover-frame-3d-margin-y': `${VIEW_MARGIN_Y}px` } as React.CSSProperties) : undefined}>
          {coverFrame3D
            ? (
              <React.Suspense fallback={null}>
                <CoverFrame3DView config={coverFrame3D} className={s.coverFrameOverlay} />
              </React.Suspense>
            )
            : <CoverFrameCorners config={coverFrameCorners} className={s.coverFrameOverlay} />}
        </div>
      )}
    </div>
    <CoverFramePickerModal
      show={showCoverFrameModal}
      onClose={() => setShowCoverFrameModal(false)}
      borders={ownedCoverFrames}
      selectedId={coverFrameId}
      onPick={handleCoverFramePick}
    />
    </>
  );
};
