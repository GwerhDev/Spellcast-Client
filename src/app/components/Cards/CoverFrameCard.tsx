import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faTrophy, faCheck, faImage } from '@fortawesome/free-solid-svg-icons';
import type { CoverFrame } from '../../../config/assets';
import { useLanguage } from '../../../i18n';
import { getCoverFrameStyle, getCoverFrameCorners } from '../../../utils/coverFrame';
import { CoverFrameCorners } from '../CoverFrameCorners';
// TCORE-123: reuses PageBackgroundCard's module -- every class below but the thumbnail
// itself (productCard, lockOverlay, activePill, freeBadge, btn*, ownedBadge, ...) is
// already asset-agnostic; duplicating that CSS into a second module would only drift.
import s from './PageBackgroundCard.module.css';

interface CoverFrameCardProps {
  asset: CoverFrame;
  unlocked: boolean;
  isActive: boolean;
  onAction: (id: string) => void;
  // TCORE-109: see PageBackgroundCard's own comment -- same acquire-vs-equip split. Here
  // "equip" sets/clears the GLOBAL default (casterInventorySlice.activeCoverFrameId), not
  // this asset's own state -- a spell's own per-spell pick (SpellDetail) overrides it and
  // isn't shown or settable from this card at all.
  showEquipControls?: boolean;
}

export const CoverFrameCard: React.FC<CoverFrameCardProps> = ({ asset, unlocked, isActive, onAction, showEquipControls = true }) => {
  const { t } = useLanguage();
  const locked = !unlocked;
  const showActive = isActive && showEquipControls;
  const corners = getCoverFrameCorners(asset.id);

  return (
    <div
      data-testid={`cover-frame-card-${asset.id}`}
      className={`${s.productCard} ${s.pageProductCard} ${showActive ? s.productCardActive : ''} ${locked ? s.productCardLocked : ''}`}
      onClick={() => showEquipControls && unlocked && onAction(asset.id)}
    >
      <div className={s.pageThumbnail} style={{ background: 'var(--component-background)' }}>
        <div
          data-testid={`cover-frame-preview-${asset.id}`}
          style={{ position: 'relative', width: '70%', aspectRatio: '3 / 4', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-dark-300)', overflow: 'hidden', ...getCoverFrameStyle(asset.id) }}
        >
          <FontAwesomeIcon icon={faImage} style={{ color: 'var(--color-light-400)', fontSize: '1.2rem' }} />
          {corners && <CoverFrameCorners config={corners} />}
        </div>
        {locked && (
          <div className={s.lockOverlay}>
            <FontAwesomeIcon icon={asset.unlockMethod === 'achievement' ? faTrophy : faLock} className={s.lockIcon} />
          </div>
        )}
        {showActive && (
          <span className={s.activePill}>
            <FontAwesomeIcon icon={faCheck} /> {t.havenStore.active}
          </span>
        )}
      </div>
      <div className={s.productBody}>
        <span className={s.productName}>{asset.name}</span>
        <div className={s.productFooter}>
          {asset.unlockMethod === 'free' && <span className={s.freeBadge}>{t.havenStore.free}</span>}
          {asset.unlockMethod === 'achievement' && (
            <span className={s.achievementBadge}><FontAwesomeIcon icon={faTrophy} /></span>
          )}
          {locked && asset.unlockMethod === 'free' && (
            <button
              data-testid={`cover-frame-unlock-${asset.id}`}
              className={s.btnBuy}
              onClick={e => { e.stopPropagation(); onAction(asset.id); }}
            >
              {t.havenStore.unlock}
            </button>
          )}
          {locked && asset.unlockMethod === 'achievement' && (
            <span className={s.achievementLabel}>{t.havenStore.achievementRequired}</span>
          )}
          {unlocked && showEquipControls && (
            <button
              data-testid={`cover-frame-toggle-${asset.id}`}
              className={isActive ? s.btnActive : s.btnSet}
              onClick={e => { e.stopPropagation(); onAction(asset.id); }}
            >
              {isActive ? t.havenStore.deactivate : t.havenStore.setActive}
            </button>
          )}
          {unlocked && !showEquipControls && (
            <span className={s.ownedBadge} data-testid={`cover-frame-owned-${asset.id}`}>
              <FontAwesomeIcon icon={faCheck} /> {t.havenStore.owned}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
