import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan, faCat, faCheck } from '@fortawesome/free-solid-svg-icons';
import type { Companion } from '../../../config/assets';
import { useLanguage, assetName } from '../../../i18n';
import s from './CompanionCard.module.css';

interface CompanionChoiceCardProps {
  // The caster's default (whichever companion it is, if any), or no companion.
  kind: 'default' | 'none';
  // The default's companion (kind 'default').
  companion?: Companion | null;
  isActive: boolean;
  onUse: () => void;
  activeLabel: string;
  useLabel: string;
}

// A pick that isn't one companion -- the caster's default, or none -- as one more card beside
// the companions (see CompanionCard), picked like any of them.
export const CompanionChoiceCard: React.FC<CompanionChoiceCardProps> = ({ kind, companion = null, isActive, onUse, activeLabel, useLabel }) => {
  const { t } = useLanguage();
  const isDefault = kind === 'default';
  return (
    <div data-testid={`companion-card-pick-${kind}`} className={`${s.productCard} ${isActive ? s.productCardActive : ''}`}>
      <div className={s.artwork} style={{ background: isDefault && companion ? companion.thumbnail : 'var(--component-background)' }}>
        <FontAwesomeIcon icon={isDefault ? faCat : faBan} className={s.artworkIcon} />
        {isActive && (
          <span className={s.activePill}>
            <FontAwesomeIcon icon={faCheck} /> {activeLabel}
          </span>
        )}
      </div>
      <div className={s.productBody}>
        <span className={s.productName}>{isDefault ? t.common.default : t.common.none}</span>
        {isDefault && <p className={s.productDesc}>{companion ? assetName(t, companion) : t.common.none}</p>}
        <div className={s.productFooter}>
          {!isActive && (
            <button data-testid={`companion-toggle-pick-${kind}`} className={s.btnSet} onClick={onUse}>
              {useLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
