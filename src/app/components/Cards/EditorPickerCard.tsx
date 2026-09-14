import s from './EditorPickerCard.module.css';
import React, { useMemo, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faScroll } from '@fortawesome/free-solid-svg-icons';
import { Spell } from 'src/interfaces';
import { useAppSelector } from '../../../store/hooks';
import { resolveCoverFrameId, getCoverFrameStyle, getCoverFrameCorners, getCoverFrame3D } from '../../../utils/coverFrame';
import { CoverFrameCorners } from '../CoverFrameCorners';
import { VIEW_MARGIN_X, VIEW_MARGIN_Y } from '../Cover3D/constants';

// TCORE-124: same lazy boundary as SpellCard's own (see that file's comment) -- this card
// renders on /editor/select, a route of its own, but three/@react-three/fiber/@react-three/
// drei still shouldn't load there unless show3D is actually true for at least one card.
const CoverFrame3DView = React.lazy(() =>
  import('../Cover3D/CoverFrame3DView').then(m => ({ default: m.CoverFrame3DView }))
);

// Matches .card's own `border-radius: .3rem` in EditorPickerCard.module.css (16px root ->
// 4.8px) -- see SpellCard's own COVER_RADIUS comment for why this can't be a shared CSS
// clip once 3D is active.
const COVER_RADIUS = 4.8;

interface EditorPickerCardProps {
  doc: Spell;
  onClick: () => void;
  // TCORE-124: mirrors SpellCard's own show3D prop exactly -- see that prop's comment.
  show3D?: boolean;
}

export const EditorPickerCard = ({ doc, onClick, show3D }: EditorPickerCardProps) => {
  const totalPages = useMemo(() => {
    if (!doc.pagesContent) return null;
    try { return JSON.parse(doc.pagesContent).length; } catch { return null; }
  }, [doc.pagesContent]);

  const activeCoverFrameId = useAppSelector(state => state.casterInventory.activeCoverFrameId);
  const resolvedCoverFrameId = resolveCoverFrameId(doc.coverFrameId, activeCoverFrameId);
  const coverFrameStyle = getCoverFrameStyle(resolvedCoverFrameId);
  const coverFrameCorners = getCoverFrameCorners(resolvedCoverFrameId);
  const coverFrame3D = show3D ? getCoverFrame3D(resolvedCoverFrameId) : null;

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!doc.cover) return;
    const url = URL.createObjectURL(doc.cover);
    setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [doc.cover]);

  const hasCoverFrame = !!(coverUrl && coverFrameCorners);

  return (
    <div className={s.card} onClick={onClick}>
      {/* TCORE-123 follow-up: same split as SpellCard (see its own comment) -- .cardClip
          carries the rounded-corner overflow clipping, so CoverFrameCorners (a sibling,
          living directly on the unclipped .card) can overhang the cover's edge instead of
          being cut off by it. */}
      <div className={s.cardClip}>
        <div className={s.coverWrap}>
          {coverUrl
            ? (coverFrame3D
              // See SpellCard's own comment on this same fork -- the actual cover pixels
              // render inside CoverFrame3DView's textured plane below when 3D is active.
              ? <div className={s.cover} style={coverFrameStyle} role="img" aria-label={doc.title} />
              : <img src={coverUrl} alt={doc.title} className={s.cover} style={coverFrameStyle} />)
            : <div className={s.iconWrapper}><FontAwesomeIcon icon={faScroll} className={s.icon} /></div>
          }
        </div>
        <div className={s.footer}>
          <span className={s.title}>{doc.title}</span>
          <small className={s.meta}>
            {new Date(doc.createdAt).toLocaleDateString()}
            {totalPages ? ` · ${totalPages}p` : ''}
          </small>
        </div>
      </div>
      {hasCoverFrame && (
        // z-index only set here, inline, for the 3D branch -- see .coverFrameSlot's own
        // CSS comment (and SpellCard's, which this mirrors).
        <div className={s.coverFrameSlot} style={coverFrame3D ? ({ '--cover-frame-3d-margin-x': `${VIEW_MARGIN_X}px`, '--cover-frame-3d-margin-y': `${VIEW_MARGIN_Y}px`, zIndex: 1 } as React.CSSProperties) : undefined}>
          {coverFrame3D
            ? (
              <React.Suspense fallback={null}>
                <CoverFrame3DView config={coverFrame3D} coverUrl={coverUrl!} radius={COVER_RADIUS} />
              </React.Suspense>
            )
            : <CoverFrameCorners config={coverFrameCorners} />}
        </div>
      )}
    </div>
  );
};
