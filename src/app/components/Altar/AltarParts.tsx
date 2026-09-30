import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faHandPointer, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { IconButton } from '../Buttons/IconButton';
import { Waveform } from '../Waveform/Waveform';
import spellcastLogo from '../../../assets/spellcast-logo.svg';
import s from './Altar.module.css';

// The small pieces that go into AltarPanel's slots.

interface AltarCornerButtonProps {
  icon: IconProp;
  title: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  'data-testid'?: string;
}

// A round chip for the panel's corners; danger turns red on hover.
export const AltarCornerButton = ({ icon, title, onClick, danger, disabled, 'data-testid': testId }: AltarCornerButtonProps) => (
  <IconButton
    data-testid={testId}
    icon={icon}
    title={title}
    className={`${s.cornerButton} ${danger ? s.cornerDanger : ''}`}
    onClick={onClick}
    disabled={disabled}
  />
);

// Quoted: Vite inlines small SVGs as data URIs containing single quotes, which an unquoted
// url() rejects.
const brandMask = `url("${spellcastLogo}")`;

// The Spellcast mark, drawn as a mask in the surrounding text color so it follows the theme.
export const AltarBrandIcon = () => (
  <span
    data-testid="altar-brand-icon"
    className={s.brandIcon}
    style={{ maskImage: brandMask, WebkitMaskImage: brandMask }}
    aria-hidden="true"
  />
);

// The loaded spell's audio waveform, large and display only: animated while reading.
export const AltarWave = ({ active }: { active: boolean }) => (
  <div data-testid="altar-wave" className={s.wave} aria-hidden="true">
    <Waveform active={active} bars={5} height={64} barWidth={9} gap={7} />
  </div>
);

interface AltarNowReadingProps {
  status: string;
  // "Page X of Y", once the spell's pages are read.
  page?: string;
  title: string;
}

export const AltarNowReading = ({ status, page, title }: AltarNowReadingProps) => (
  <div data-testid="altar-now" className={s.nowReading}>
    <span className={s.nowStatus}>
      <span>{status}</span>
      {page && (
        <>
          <span className={s.nowDot} aria-hidden="true">·</span>
          <span>{page}</span>
        </>
      )}
    </span>
    <span data-testid="altar-title" className={s.nowTitle} title={title}>{title}</span>
  </div>
);

interface AltarHintProps {
  text: string;
  // Something is in progress (an import): a spinner instead of the pointer.
  busy?: boolean;
  // Stepped aside (e.g. while the button's menu is open), still taking its space.
  hidden?: boolean;
}

export const AltarHint = ({ text, busy, hidden }: AltarHintProps) => (
  <p data-testid="altar-hint" className={`${s.hint} ${hidden ? s.hintHidden : ''}`} aria-hidden={hidden || undefined}>
    <FontAwesomeIcon icon={busy ? faSpinner : faHandPointer} spin={busy} className={s.hintIcon} />
    <span>{text}</span>
  </p>
);
