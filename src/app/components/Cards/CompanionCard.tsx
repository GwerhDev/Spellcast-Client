import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCat, faLock, faTrophy, faCheck } from '@fortawesome/free-solid-svg-icons';
import type { Companion } from '../../../config/assets';
import { useLanguage } from '../../../i18n';
import s from './CompanionCard.module.css';

interface CompanionCardProps {
  companion: Companion;
  unlocked: boolean;
  isActive: boolean;
  onAction: (id: string) => void;
  // TCORE-109: Havenstore is acquisition-only now -- when false, hides the equip
  // affordances (active pill, activate/deactivate button); an already-unlocked item shows a
  // static "owned" status instead of a button. Defaults to true so ReaderSettings' existing
  // equip usage, and the new Caster inventory view, are unaffected.
  showEquipControls?: boolean;
}

// Same card used for the Havenstore acquisition grid and the Reader Settings/Caster
// inventory "Companions" surfaces, so a companion looks identical everywhere -- only
// showEquipControls differs between "can I get this" (Havenstore) and "can I equip this"
// (everywhere else).
export const CompanionCard: React.FC<CompanionCardProps> = ({ companion, unlocked, isActive, onAction, showEquipControls = true }) => {
  const { t } = useLanguage();
  const comingSoon = !!companion.comingSoon;
  const locked = !unlocked;
  const showActive = isActive && showEquipControls;

  return (
    <div
      data-testid={`companion-card-${companion.id}`}
      className={`${s.productCard} ${showActive ? s.productCardActive : ''} ${locked ? s.productCardLocked : ''}`}
    >
      <div className={s.artwork} style={{ background: companion.thumbnail }}>
        <FontAwesomeIcon icon={faCat} className={s.artworkIcon} />
        {locked && (
          <div className={s.lockOverlay}>
            <FontAwesomeIcon icon={companion.unlockMethod === 'achievement' ? faTrophy : faLock} className={s.lockIcon} />
          </div>
        )}
        {showActive && (
          <span className={s.activePill}>
            <FontAwesomeIcon icon={faCheck} /> {t.havenStore.active}
          </span>
        )}
      </div>
      <div className={s.productBody}>
        <span className={s.productName}>{companion.name}</span>
        <p className={s.productDesc}>{companion.description}</p>
        <div className={s.productFooter}>
          {comingSoon ? (
            <span className={s.soonBadge} data-testid={`companion-soon-${companion.id}`}>
              {t.havenStore.comingSoon}
            </span>
          ) : (
            <>
              {companion.unlockMethod === 'free' && (
                <span className={s.freeBadge}>{t.havenStore.free}</span>
              )}
              {companion.unlockMethod === 'achievement' && (
                <span className={s.achievementBadge}>
                  <FontAwesomeIcon icon={faTrophy} />
                </span>
              )}
              {locked && companion.unlockMethod === 'free' && (
                <button
                  data-testid={`companion-unlock-${companion.id}`}
                  className={s.btnBuy}
                  onClick={() => onAction(companion.id)}
                >
                  {t.havenStore.unlock}
                </button>
              )}
              {locked && companion.unlockMethod === 'achievement' && (
                <span className={s.achievementLabel}>{t.havenStore.achievementRequired}</span>
              )}
              {unlocked && showEquipControls && (
                <button
                  data-testid={`companion-toggle-${companion.id}`}
                  className={isActive ? s.btnActive : s.btnSet}
                  onClick={() => onAction(companion.id)}
                >
                  {isActive ? t.havenStore.deactivate : t.havenStore.setActive}
                </button>
              )}
              {unlocked && !showEquipControls && (
                <span className={s.ownedBadge} data-testid={`companion-owned-${companion.id}`}>
                  <FontAwesomeIcon icon={faCheck} /> {t.havenStore.owned}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
