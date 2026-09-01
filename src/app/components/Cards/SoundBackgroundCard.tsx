import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMusic, faLock, faTrophy, faCheck } from '@fortawesome/free-solid-svg-icons';
import type { SoundBackground } from '../../../config/assets';
import { useLanguage } from '../../../i18n';
import s from './SoundBackgroundCard.module.css';

const SOUND_ARTWORK: Record<string, string> = {
  'rain-window':      'linear-gradient(145deg, #0e2a40 0%, #1e5a8a 100%)',
  'cafe-murmur':      'linear-gradient(145deg, #2e1808 0%, #8a4010 100%)',
  'ancient-forest':   'linear-gradient(145deg, #0a2414 0%, #145c30 100%)',
  'ocean-tides':      'linear-gradient(145deg, #082430 0%, #0e6e80 100%)',
  'crackling-hearth': 'linear-gradient(145deg, #2e0e08 0%, #a03010 100%)',
  'northern-winds':   'linear-gradient(145deg, #120a30 0%, #3a1870 100%)',
};

interface SoundBackgroundCardProps {
  asset: SoundBackground;
  unlocked: boolean;
  isActive: boolean;
  onAction: (id: string) => void;
  // TCORE-109: see CompanionCard's own comment -- same acquire-vs-equip split, same default.
  showEquipControls?: boolean;
}

// TCORE-109: extracted from Havenstore's former inline renderSoundGrid so both Havenstore
// (acquire mode) and /caster/inventory (equip mode) share one implementation.
export const SoundBackgroundCard: React.FC<SoundBackgroundCardProps> = ({ asset, unlocked, isActive, onAction, showEquipControls = true }) => {
  const { t } = useLanguage();
  const locked = !unlocked;
  const showActive = isActive && showEquipControls;

  return (
    <div
      data-testid={`sound-card-${asset.id}`}
      className={`${s.productCard} ${showActive ? s.productCardActive : ''} ${locked ? s.productCardLocked : ''}`}
    >
      <div className={s.artwork} style={{ background: SOUND_ARTWORK[asset.id] ?? 'var(--color-dark-300)' }}>
        <FontAwesomeIcon icon={faMusic} className={s.artworkIcon} />
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
        <p className={s.productDesc}>{asset.description}</p>
        <div className={s.productFooter}>
          {asset.unlockMethod === 'free' && (
            <span className={s.freeBadge}>{t.havenStore.free}</span>
          )}
          {asset.unlockMethod === 'achievement' && (
            <span className={s.achievementBadge}>
              <FontAwesomeIcon icon={faTrophy} />
            </span>
          )}
          {locked && asset.unlockMethod === 'free' && (
            <button
              data-testid={`sound-unlock-${asset.id}`}
              className={s.btnBuy}
              onClick={() => onAction(asset.id)}
            >
              {t.havenStore.unlock}
            </button>
          )}
          {locked && asset.unlockMethod === 'achievement' && (
            <span className={s.achievementLabel}>{t.havenStore.achievementRequired}</span>
          )}
          {unlocked && showEquipControls && (
            <button
              data-testid={`sound-toggle-${asset.id}`}
              className={isActive ? s.btnActive : s.btnSet}
              onClick={() => onAction(asset.id)}
            >
              {isActive ? t.havenStore.deactivate : t.havenStore.setActive}
            </button>
          )}
          {unlocked && !showEquipControls && (
            <span className={s.ownedBadge} data-testid={`sound-owned-${asset.id}`}>
              <FontAwesomeIcon icon={faCheck} /> {t.havenStore.owned}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
