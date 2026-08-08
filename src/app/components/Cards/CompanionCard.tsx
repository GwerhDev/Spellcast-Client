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
}

// Same card used for the Havenstore "Companions" tab and the Reader Settings
// "Companions" tab, so both surfaces show a companion identically.
export const CompanionCard: React.FC<CompanionCardProps> = ({ companion, unlocked, isActive, onAction }) => {
  const { t } = useLanguage();
  const comingSoon = !!companion.comingSoon;
  const locked = !unlocked;

  return (
    <div
      data-testid={`companion-card-${companion.id}`}
      className={`${s.productCard} ${isActive ? s.productCardActive : ''} ${locked ? s.productCardLocked : ''}`}
    >
      <div className={s.artwork} style={{ background: companion.thumbnail }}>
        <FontAwesomeIcon icon={faCat} className={s.artworkIcon} />
        {locked && (
          <div className={s.lockOverlay}>
            <FontAwesomeIcon icon={companion.unlockMethod === 'achievement' ? faTrophy : faLock} className={s.lockIcon} />
          </div>
        )}
        {isActive && (
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
              {unlocked && (
                <button
                  data-testid={`companion-toggle-${companion.id}`}
                  className={isActive ? s.btnActive : s.btnSet}
                  onClick={() => onAction(companion.id)}
                >
                  {isActive ? t.havenStore.deactivate : t.havenStore.setActive}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
