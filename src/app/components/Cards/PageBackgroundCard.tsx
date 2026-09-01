import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faTrophy, faCheck } from '@fortawesome/free-solid-svg-icons';
import type { PageBackground } from '../../../config/assets';
import { useLanguage } from '../../../i18n';
import s from './PageBackgroundCard.module.css';

interface PageBackgroundCardProps {
  asset: PageBackground;
  unlocked: boolean;
  isActive: boolean;
  onAction: (id: string) => void;
  // TCORE-109: see CompanionCard's own comment -- same acquire-vs-equip split, same default.
  // Also gates the whole-card click-to-equip convenience below (acquire mode never equips
  // from a card click, only ever from the explicit unlock button).
  showEquipControls?: boolean;
}

// TCORE-109: extracted from Havenstore's former inline renderPageGrid so both Havenstore
// (acquire mode) and /caster/inventory (equip mode) share one implementation.
export const PageBackgroundCard: React.FC<PageBackgroundCardProps> = ({ asset, unlocked, isActive, onAction, showEquipControls = true }) => {
  const { t } = useLanguage();
  const locked = !unlocked;
  const showActive = isActive && showEquipControls;
  const isDark = asset.thumbnail === '#1e2433' || asset.thumbnail === '#2a1f0e';
  const thumbStyle = asset.thumbnail.startsWith('var(') ? { background: 'var(--paper-bg)' } : { background: asset.thumbnail };

  return (
    <div
      data-testid={`page-card-${asset.id}`}
      className={`${s.productCard} ${s.pageProductCard} ${showActive ? s.productCardActive : ''} ${locked ? s.productCardLocked : ''}`}
      onClick={() => showEquipControls && unlocked && onAction(asset.id)}
    >
      <div className={s.pageThumbnail} style={thumbStyle}>
        {unlocked && (
          <div className={s.pageThumbnailLines} style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)' }}>
            {[100, 75, 90, 60, 85].map((w, i) => (
              <div key={i} className={s.pageThumbnailLine} style={{ width: `${w}%` }} />
            ))}
          </div>
        )}
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
              data-testid={`page-unlock-${asset.id}`}
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
              data-testid={`page-toggle-${asset.id}`}
              className={isActive ? s.btnActive : s.btnSet}
              onClick={e => { e.stopPropagation(); onAction(asset.id); }}
            >
              {isActive ? t.havenStore.deactivate : t.havenStore.setActive}
            </button>
          )}
          {unlocked && !showEquipControls && (
            <span className={s.ownedBadge} data-testid={`page-owned-${asset.id}`}>
              <FontAwesomeIcon icon={faCheck} /> {t.havenStore.owned}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
