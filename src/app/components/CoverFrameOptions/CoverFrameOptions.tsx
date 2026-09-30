import s from './CoverFrameOptions.module.css';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import type { CoverFrame } from '../../../config/assets';
import { getCoverFrameStyle, getCoverFrameCorners } from '../../../utils/coverFrame';
import { CoverFrameCorners } from '../CoverFrameCorners';
import { useLanguage, assetName } from '../../../i18n';

interface CoverFrameOptionsProps {
  borders: CoverFrame[];
  // Mirrors Spell.coverFrameId as-is (see that field's own comment): undefined means this
  // spell never made an explicit choice (follows the global default), null means it
  // explicitly opted out of one, and a border id means its own explicit pick.
  selectedId: string | null | undefined;
  onPick: (id: string | null | undefined) => void;
}

// TCORE-123: the per-spell cover frame choices -- a plain list rather than a grid of
// CoverFrameCard (that component's acquire/equip framing doesn't fit "pick one option for
// this spell", and every frame here is already owned by definition since only owned ones
// are ever passed in). `borders` can be empty: the list is then just Default/No frame.
export const CoverFrameOptions: React.FC<CoverFrameOptionsProps> = ({ borders, selectedId, onPick }) => {
  const { t } = useLanguage();

  const isDefaultSelected = selectedId === undefined;
  const isNoneSelected = selectedId === null;

  return (
    <div data-testid="cover-frame-options" className={s.list}>
      <button
        type="button"
        data-testid="cover-frame-option-default"
        className={`${s.option} ${isDefaultSelected ? s.optionSelected : ''}`}
        onClick={() => onPick(undefined)}
      >
        <span className={s.swatch} />
        <span className={s.optionName}>{t.spell.coverFrameDefault}</span>
        {isDefaultSelected && <FontAwesomeIcon icon={faCheck} className={s.checkIcon} />}
      </button>
      <button
        type="button"
        data-testid="cover-frame-option-none"
        className={`${s.option} ${isNoneSelected ? s.optionSelected : ''}`}
        onClick={() => onPick(null)}
      >
        <span className={s.swatch} />
        <span className={s.optionName}>{t.spell.coverFrameNone}</span>
        {isNoneSelected && <FontAwesomeIcon icon={faCheck} className={s.checkIcon} />}
      </button>
      {borders.map(border => {
        const isSelected = selectedId === border.id;
        const corners = getCoverFrameCorners(border.id);
        return (
          <button
            type="button"
            key={border.id}
            data-testid={`cover-frame-option-${border.id}`}
            className={`${s.option} ${isSelected ? s.optionSelected : ''}`}
            onClick={() => onPick(border.id)}
          >
            <span className={s.swatch} style={getCoverFrameStyle(border.id)}>
              {corners && <CoverFrameCorners config={corners} />}
            </span>
            <span className={s.optionName}>{assetName(t, border)}</span>
            {isSelected && <FontAwesomeIcon icon={faCheck} className={s.checkIcon} />}
          </button>
        );
      })}
    </div>
  );
};
