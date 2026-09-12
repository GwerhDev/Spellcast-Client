import s from './EditorPickerCard.module.css';
import { useMemo, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faScroll } from '@fortawesome/free-solid-svg-icons';
import { Spell } from 'src/interfaces';
import { useAppSelector } from '../../../store/hooks';
import { resolveCoverFrameId, getCoverFrameStyle, getCoverFrameCorners } from '../../../utils/coverFrame';
import { CoverFrameCorners } from '../CoverFrameCorners';

interface EditorPickerCardProps {
  doc: Spell;
  onClick: () => void;
}

export const EditorPickerCard = ({ doc, onClick }: EditorPickerCardProps) => {
  const totalPages = useMemo(() => {
    if (!doc.pagesContent) return null;
    try { return JSON.parse(doc.pagesContent).length; } catch { return null; }
  }, [doc.pagesContent]);

  const activeCoverFrameId = useAppSelector(state => state.casterInventory.activeCoverFrameId);
  const resolvedCoverFrameId = resolveCoverFrameId(doc.coverFrameId, activeCoverFrameId);
  const coverFrameStyle = getCoverFrameStyle(resolvedCoverFrameId);
  const coverFrameCorners = getCoverFrameCorners(resolvedCoverFrameId);

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
            ? <img src={coverUrl} alt={doc.title} className={s.cover} style={coverFrameStyle} />
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
        <div className={s.coverFrameSlot}>
          <CoverFrameCorners config={coverFrameCorners} />
        </div>
      )}
    </div>
  );
};
