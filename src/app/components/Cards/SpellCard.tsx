import s from './SpellCard.module.css';
import { SPELL_DRAG_TYPE } from '../../../config/consts';
import { DragTether } from '../DragTether/DragTether';
import { beginTouchSpellDrag, isTouchDragging } from '../../../utils/touchSpellDrag';
import React, { useEffect, useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faScroll, faHourglassHalf, faCheck } from '@fortawesome/free-solid-svg-icons';
import { Spell } from '../../../interfaces';
import { Waveform } from '../Waveform/Waveform';
import { useAppSelector } from '../../../store/hooks';
import { resolveCoverFrameId, getCoverFrameStyle, getCoverFrameCorners, getCoverFrame3D } from '../../../utils/coverFrame';
import { CoverFrameCorners } from '../CoverFrameCorners';
import { VIEW_MARGIN_X, VIEW_MARGIN_Y } from '../Cover3D/constants';
import { LazyCoverFrame3DCanvas, LazyCoverFrame3DView } from '../Cover3D/lazyCover3D';

// Matches .card/.cardClip's own `border-radius: .2rem` in SpellCard.module.css (16px root
// -> 3.2px) -- the 3D cover plane rounds its own corners in geometry (see
// CoverTexturePlane), since it lives in an unclipped View a CSS radius can't reach.
const COVER_RADIUS = 3.2;

interface UploadJob {
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: { current: number; total: number } | null;
}

interface SpellCardProps {
  doc: Spell;
  // This card's spell is the one loaded in the player (playing or paused).
  isActive?: boolean;
  isPlaying?: boolean;
  // Opens the spell's detail, where its actions (read, edit, delete, cover) live. With a
  // cover, it comes with the cover's place on screen and image, for the cover to fly from.
  onClick: (origin?: { rect: { top: number; left: number; width: number; height: number }; coverUrl: string; element: HTMLElement; coverFrameId: string | null }) => void;
  // This card's cover has lifted off into its open detail: its place stays, empty.
  lifted?: boolean;
  // In the keyboard's tab order (off for a card that's only shown, e.g. behind a coverflow's
  // front row, where it's brought forward rather than tabbed to).
  focusable?: boolean;
  uploadJob?: UploadJob | null;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  // A click with Ctrl/⌘ or Shift held: the list selects with it (a file manager's gestures,
  // see listSelection) instead of the card opening.
  onModifiedClick?: (modifiers: { toggle: boolean; range: boolean }) => void;
  // TCORE-124: true once the caller's own gate (Mode3D user setting + desktop +
  // !reduced-motion + this card in viewport, see useCoverFrame3DGate) says this specific
  // card should get 3D corners instead of the flat 2D CoverFrameCorners. Undefined/false
  // keeps today's plain 2D behavior -- a caller that never passes this literally cannot
  // change (QuickStart/SpellList opt in explicitly, everything else keeps working exactly
  // as before untouched).
  show3D?: boolean;
  // The 3D cover in a canvas of its own, part of the card (see CoverFrame3DCanvas), rather
  // than drawn into the app's shared one: for a card that's transformed, dimmed or
  // overlapped by others (a coverflow's), which only its own canvas follows.
  own3DCanvas?: boolean;
}

// A spell in a grid: just its cover, which glows on hover. Clicking opens its detail; the
// only thing drawn over the cover is the reading indicator, while it's the loaded spell.
export const SpellCard = ({ doc, isActive, isPlaying, onClick, lifted = false, focusable = true, uploadJob, selectionMode, selected, onToggleSelect, onModifiedClick, show3D, own3DCanvas = false }: SpellCardProps) => {
  // TCORE-123: this spell's own pick, falling back to the global default when unset. The
  // pick itself is made from the spell's detail, which refreshes the lists after saving.
  const { activeCoverFrameId } = useAppSelector(state => state.casterInventory);
  const coverFrameId = doc.coverFrameId;
  const resolvedCoverFrameId = resolveCoverFrameId(coverFrameId, activeCoverFrameId);
  const coverFrameStyle = getCoverFrameStyle(resolvedCoverFrameId);
  const coverFrameCorners = getCoverFrameCorners(resolvedCoverFrameId);
  // TCORE-124: only looked up (and only rendered below) when the caller's own gate says
  // this card should render its corners in 3D -- getCoverFrame3D returns null both when
  // show3D is false AND when this resolved frame has no 3D geometry at all, so a frame
  // without a 3D asset yet still falls back to the plain 2D corners even with 3D enabled.
  const coverFrame3D = show3D ? getCoverFrame3D(resolvedCoverFrameId) : null;

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  // While this card is being dragged it keeps its place as an empty placeholder, tied to
  // the pointer by a thread from that place (its center, in viewport coordinates).
  const [dragging, setDragging] = useState(false);
  const [dragOrigin, setDragOrigin] = useState<{ x: number; y: number } | null>(null);
  // The frame scheduled to switch to the placeholder; a drag that ends before it runs must
  // cancel it, or it would turn the placeholder on after the drag is already over.
  const dragFrameRef = useRef<number | null>(null);
  // A touch drag waiting for its long press, or under way (see touchSpellDrag): cancelled
  // if the card goes away first.
  const touchDragRef = useRef<(() => void) | null>(null);
  useEffect(() => () => touchDragRef.current?.(), []);

  useEffect(() => {
    if (!doc.cover) return;
    const url = URL.createObjectURL(doc.cover);
    setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [doc.cover]);

  const coverRef = useRef<HTMLDivElement>(null);

  const handleClick = (e?: React.MouseEvent) => {
    const toggle = !!e && (e.ctrlKey || e.metaKey);
    const range = !!e?.shiftKey;
    if (onModifiedClick && (toggle || range)) { onModifiedClick({ toggle, range }); return; }
    if (selectionMode) { onToggleSelect?.(); return; }
    const el = coverRef.current;
    const box = el?.getBoundingClientRect();
    onClick(coverUrl && el && box ? { rect: { top: box.top, left: box.left, width: box.width, height: box.height }, coverUrl, element: el, coverFrameId: resolvedCoverFrameId } : undefined);
  };

  const hasCoverFrame = !!(coverUrl && coverFrameCorners);

  return (
    <>
    <div
      data-testid={`spell-card-${doc.id}`}
      // Its spell, for a selection box dragged across the list (see useMarqueeSelect).
      data-spell-id={doc.id}
      // The cover is all a pointer device sees of it: its title as the tooltip and name.
      title={doc.title}
      aria-label={doc.title}
      className={`${s.card} ${isActive ? s.cardActive : ''} ${selected ? s.cardSelected : ''} ${hasCoverFrame ? s.cardSquared : ''} ${dragging ? s.cardDragging : ''} ${lifted ? s.cardLifted : ''}`}
      onClick={handleClick}
      // Reachable and opened by keyboard too: Enter or Space acts like a click (opening its
      // detail, or selecting it in selection mode).
      role="button"
      tabIndex={focusable ? 0 : -1}
      aria-pressed={selectionMode ? !!selected : undefined}
      onKeyDown={e => {
        if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        handleClick();
      }}
      // Draggable onto a drop target that reads spells (e.g. Start's "Read" tab), which gets
      // the spell id under SPELL_DRAG_TYPE. Off in selection mode, where clicks select.
      draggable={!selectionMode}
      // A finger can't start the native drag above: holding the card still picks it up
      // instead, firing the same drag events (see touchSpellDrag).
      onTouchStart={e => {
        if (selectionMode || e.touches.length !== 1) return;
        const touch = e.touches[0];
        const card = e.currentTarget;
        touchDragRef.current?.();
        touchDragRef.current = beginTouchSpellDrag({ x: touch.clientX, y: touch.clientY }, card, doc.id, {
          onStart: () => {
            const rect = card.getBoundingClientRect();
            setDragging(true);
            setDragOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
          },
        });
      }}
      onDragStart={e => {
        // A browser that does start a native drag from a long touch: the touch one is on.
        if (isTouchDragging()) { e.preventDefault(); return; }
        e.dataTransfer.setData(SPELL_DRAG_TYPE, doc.id);
        e.dataTransfer.effectAllowed = 'copy';
        const rect = e.currentTarget.getBoundingClientRect();
        const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        // The browser snapshots the drag image right after this handler; switching to the
        // placeholder on the next frame keeps the real card as what follows the cursor.
        dragFrameRef.current = requestAnimationFrame(() => {
          dragFrameRef.current = null;
          setDragging(true);
          setDragOrigin(origin);
        });
      }}
      onDragEnd={() => {
        if (dragFrameRef.current !== null) {
          cancelAnimationFrame(dragFrameRef.current);
          dragFrameRef.current = null;
        }
        setDragging(false);
        setDragOrigin(null);
      }}
    >
      {/* TCORE-123 follow-up: everything that needs to respect .card's own rounded
          corners (or that positions itself with inset:0 expecting to be clipped, like the
          upload overlay or the hover scrim) lives inside this inner clip wrapper.
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
        {isActive && !selectionMode && (
          <div data-testid={`spell-card-now-${doc.id}`} className={s.nowIndicator} aria-hidden="true">
            <Waveform active={!!isPlaying} bars={4} height={14} color="white" />
          </div>
        )}
        <div ref={coverRef} className={s.coverWrapper}>
          {coverUrl
            ? (coverFrame3D
              // TCORE-124 follow-up: when 3D is active, the actual cover pixels are drawn
              // by CoverFrame3DView's own textured plane (in the unclipped .coverFrameSlot
              // below, alongside the ornaments -- one object, see that file's own
              // comment) instead of this `<img>`. This stays a real, clipped/rounded DOM
              // placeholder in .coverWrapper's exact box -- .coverTags/.uploadOverlay
              // below still anchor to it, and it keeps the accessible name the `<img
              // alt=...>` used to carry (the WebGL canvas itself has none).
              ? <div className={s.cover} style={coverFrameStyle} role="img" aria-label={doc.title} />
              : <img src={coverUrl} alt={doc.title} className={s.cover} style={coverFrameStyle} draggable={false} />)
            : <div className={s.iconWrapper}><FontAwesomeIcon icon={faScroll} className={s.icon} /></div>
          }
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
      {dragging && (
        <div className={s.dragPlaceholder} data-testid={`spell-card-placeholder-${doc.id}`} aria-hidden="true">
          <span className={s.dragRipple} />
          <span className={`${s.dragRipple} ${s.dragRippleLate}`} />
          <FontAwesomeIcon icon={faScroll} />
        </div>
      )}
      {dragOrigin && <DragTether origin={dragOrigin} />}
      {hasCoverFrame && !dragging && (
        // z-index only set here, inline, for the 3D branch -- see .coverFrameSlot's own
        // CSS comment for why 2D CoverFrameCorners needs to stay at z-index:auto (matches
        // production) while CoverFrame3DView's own larger ornaments need to yield to
        // .nowIndicator/.uploadOverlay.
        <div className={s.coverFrameSlot} style={coverFrame3D ? ({ '--cover-frame-3d-margin-x': `${VIEW_MARGIN_X}px`, '--cover-frame-3d-margin-y': `${VIEW_MARGIN_Y}px`, zIndex: 1 } as React.CSSProperties) : undefined}>
          {coverFrame3D
            ? (
              <React.Suspense fallback={null}>
                {own3DCanvas
                  ? <LazyCoverFrame3DCanvas config={coverFrame3D} coverUrl={coverUrl!} radius={COVER_RADIUS} className={s.coverFrameOverlay} />
                  : <LazyCoverFrame3DView config={coverFrame3D} coverUrl={coverUrl!} radius={COVER_RADIUS} className={s.coverFrameOverlay} />}
              </React.Suspense>
            )
            : <CoverFrameCorners config={coverFrameCorners} className={s.coverFrameOverlay} />}
        </div>
      )}
    </div>
    </>
  );
};
