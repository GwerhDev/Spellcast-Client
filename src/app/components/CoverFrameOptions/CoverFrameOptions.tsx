import s from './CoverFrameOptions.module.css';
import React, { type ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
import type { CoverFrame } from '../../../config/assets';
import { getCoverFrameStyle, getCoverFrameCorners } from '../../../utils/coverFrame';
import { CoverFrameCorners } from '../CoverFrameCorners';
import { useLanguage, assetName } from '../../../i18n';

type FramePick = string | null | undefined;

interface CoverFrameOptionsProps {
  borders: CoverFrame[];
  // Mirrors Spell.coverFrameId as-is (see that field's own comment): undefined means this
  // spell never made an explicit choice (follows the global default), null means it
  // explicitly opted out of one, and a border id means its own explicit pick.
  selectedId: FramePick;
  onPick: (id: FramePick) => void;
  // A pick being saved (an object, since `undefined` -- Default -- is itself a pick): that
  // option shows a spinner where its check goes, and every option is disabled meanwhile.
  pending?: { id: FramePick } | null;
  // No picks for now (e.g. while a new cover image saves).
  disabled?: boolean;
}

interface OptionProps {
  id: FramePick;
  testId: string;
  swatch: ReactNode;
  name: string;
  selected: boolean;
  pending: CoverFrameOptionsProps['pending'];
  disabled: boolean;
  onPick: (id: FramePick) => void;
}

const Option = ({ id, testId, swatch, name, selected, pending, disabled, onPick }: OptionProps) => {
  const saving = !!pending;
  const isPending = saving && pending.id === id;
  // While a pick saves, only its spinner shows -- not the check of the pick it replaces.
  const marked = isPending || (!saving && selected);
  return (
    <button
      type="button"
      data-testid={testId}
      className={`${s.option} ${marked ? s.optionSelected : ''}`}
      onClick={() => onPick(id)}
      disabled={saving || disabled}
      aria-busy={isPending || undefined}
    >
      {swatch}
      <span className={s.optionName}>{name}</span>
      {isPending
        ? <FontAwesomeIcon data-testid={`${testId}-saving`} icon={faSpinner} spin className={s.checkIcon} />
        : marked && <FontAwesomeIcon icon={faCheck} className={s.checkIcon} />}
    </button>
  );
};

// TCORE-123: the per-spell cover frame choices -- a plain list rather than a grid of
// CoverFrameCard (that component's acquire/equip framing doesn't fit "pick one option for
// this spell", and every frame here is already owned by definition since only owned ones
// are ever passed in). `borders` can be empty: the list is then just Default/No frame.
export const CoverFrameOptions: React.FC<CoverFrameOptionsProps> = ({ borders, selectedId, onPick, pending = null, disabled = false }) => {
  const { t } = useLanguage();

  return (
    <div data-testid="cover-frame-options" className={s.list}>
      <Option
        id={undefined}
        testId="cover-frame-option-default"
        swatch={<span className={s.swatch} />}
        name={t.spell.coverFrameDefault}
        selected={selectedId === undefined}
        pending={pending}
        disabled={disabled}
        onPick={onPick}
      />
      <Option
        id={null}
        testId="cover-frame-option-none"
        swatch={<span className={s.swatch} />}
        name={t.spell.coverFrameNone}
        selected={selectedId === null}
        pending={pending}
        disabled={disabled}
        onPick={onPick}
      />
      {borders.map(border => {
        const corners = getCoverFrameCorners(border.id);
        return (
          <Option
            key={border.id}
            id={border.id}
            testId={`cover-frame-option-${border.id}`}
            swatch={(
              <span className={s.swatch} style={getCoverFrameStyle(border.id)}>
                {corners && <CoverFrameCorners config={corners} />}
              </span>
            )}
            name={assetName(t, border)}
            selected={selectedId === border.id}
            pending={pending}
            disabled={disabled}
            onPick={onPick}
          />
        );
      })}
    </div>
  );
};
