import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan, faImage, faCheck, faClockRotateLeft, faBookOpenReader, faStar, faLock, faPalette, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { TabModal } from '../Modals/TabModal';
import { ToggleRow } from '../Inputs/ToggleRow';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { setAltarBackdrop, toggleQuickStartFilter, setReadOnConjure, type AltarBackdrop, type QuickStartFilter } from '../../../store/altarSlice';
import { useLanguage } from '../../../i18n';
import s from './AltarSettingsModal.module.css';

interface AltarSettingsModalProps {
  show: boolean;
  onClose: () => void;
}

interface Option<T extends string> {
  id: T;
  label: string;
  icon: IconDefinition;
  // Not there yet: shown, locked, and not pickable.
  locked?: boolean;
}

interface OptionGroupProps<T extends string> {
  name: string;
  title: string;
  description: string;
  options: Option<T>[];
  isSelected: (id: T) => boolean;
  onPick: (id: T) => void;
  // Several at once (filters that combine), not one of them.
  multiple?: boolean;
  soonLabel: string;
}

// One setting: its title, what it's for, and its choices -- one of them picked, or
// (multiple) any of them on at once.
const OptionGroup = <T extends string>({ name, title, description, options, isSelected, onPick, multiple = false, soonLabel }: OptionGroupProps<T>) => (
  <div className={s.section}>
    <p id={`${name}-label`} className={s.sectionTitle}>{title}</p>
    <p className={s.sectionDesc}>{description}</p>
    <div role={multiple ? 'group' : 'radiogroup'} aria-labelledby={`${name}-label`} className={s.options}>
      {options.map(option => {
        const selected = isSelected(option.id);
        return (
          <button
            key={option.id}
            type="button"
            role={multiple ? 'checkbox' : 'radio'}
            aria-checked={selected}
            disabled={option.locked}
            data-testid={`${name}-${option.id}`}
            className={`${s.option} ${selected ? s.optionSelected : ''} ${option.locked ? s.optionLocked : ''}`}
            onClick={() => onPick(option.id)}
          >
            <FontAwesomeIcon icon={option.icon} className={s.optionIcon} />
            <span className={s.optionLabel}>{option.label}</span>
            {selected && <FontAwesomeIcon icon={faCheck} className={s.optionCheck} />}
            {option.locked && (
              <span className={s.soonTag}>
                <FontAwesomeIcon icon={faLock} /> {soonLabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

// The altar's own settings, from the home page, in two tabs: how it looks (what the page
// shows behind it while a spell is conjured, the quick start's filters under it) and what
// it does (whether conjuring a spell starts reading it). Applied as they're picked.
export const AltarSettingsModal = ({ show, onClose }: AltarSettingsModalProps) => {
  const { t } = useLanguage();
  const dispatch = useAppDispatch();
  const { backdrop, quickStart, readOnConjure } = useAppSelector(state => state.altar);

  const backdropOptions: Option<AltarBackdrop>[] = [
    { id: 'none', label: t.start.altarBackdropNone, icon: faBan },
    { id: 'cover', label: t.start.altarBackdropCover, icon: faImage },
  ];
  const quickStartOptions: Option<QuickStartFilter>[] = [
    { id: 'last', label: t.start.quickStartLast, icon: faClockRotateLeft },
    { id: 'inProgress', label: t.start.quickStartInProgress, icon: faBookOpenReader },
    { id: 'favorites', label: t.start.quickStartFavorites, icon: faStar, locked: true },
  ];

  const appearance = (
    <div data-testid="altar-settings" className={s.body}>
      <OptionGroup
        name="altar-backdrop"
        title={t.start.altarBackdrop}
        description={t.start.altarBackdropDesc}
        options={backdropOptions}
        isSelected={id => backdrop === id}
        onPick={id => dispatch(setAltarBackdrop(id))}
        soonLabel={t.start.soon}
      />
      <OptionGroup
        name="altar-quick-start"
        title={t.start.quickStart}
        description={t.start.quickStartDesc}
        options={quickStartOptions}
        multiple
        isSelected={id => quickStart.includes(id)}
        onPick={id => dispatch(toggleQuickStartFilter(id))}
        soonLabel={t.start.soon}
      />
    </div>
  );

  const functions = (
    <div data-testid="altar-settings-functions" className={s.body}>
      <ToggleRow
        label={t.start.readOnConjure}
        description={t.start.readOnConjureDesc}
        value={readOnConjure}
        onChange={value => dispatch(setReadOnConjure(value))}
      />
    </div>
  );

  return (
    <TabModal
      show={show}
      onClose={onClose}
      title={t.start.altarSettings}
      tabs={[
        { icon: faPalette, label: t.start.altarAppearanceTab, content: appearance },
        { icon: faWandMagicSparkles, label: t.start.altarFunctionsTab, content: functions },
      ]}
    />
  );
};
