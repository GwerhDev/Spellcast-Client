import { faBackwardStep, faEject, faForwardStep, faPause, faPlay, faRightToBracket } from '@fortawesome/free-solid-svg-icons';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import type { ReactNode } from 'react';
import { IconButton } from '../Buttons/IconButton';
import s from './SpellTransport.module.css';

interface SpellTransportLabels {
  mount: string;
  unmount: string;
  play: string;
  pause: string;
  previous: string;
  next: string;
}

interface SpellTransportProps {
  // Shares the row, on the left (e.g. the spell's page count).
  leading?: ReactNode;
  // This spell is the one loaded in the player.
  mounted: boolean;
  isPlaying: boolean;
  canPrevious: boolean;
  canNext: boolean;
  onMount: () => void;
  onUnmount: () => void;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  labels: SpellTransportLabels;
}

interface ControlProps {
  icon: IconProp;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  'data-testid': string;
}

const Control = ({ icon, label, onClick, disabled, primary, 'data-testid': testId }: ControlProps) => (
  <IconButton
    data-testid={testId}
    icon={icon}
    title={label}
    className={`${s.control} ${primary ? s.controlPrimary : ''}`}
    onClick={onClick}
    disabled={disabled}
  />
);

// A spell's own small playback controls, for its detail, laid out as one row: `leading` on
// the left, and at the end the button that loads the spell into the player (paused,
// without leaving the page) -- or, once it's the loaded spell, previous page, play/pause and
// next page in the middle and unloading it at the end.
export const SpellTransport = ({
  leading, mounted, isPlaying, canPrevious, canNext, onMount, onUnmount, onTogglePlay, onPrevious, onNext, labels,
}: SpellTransportProps) => (
  <div data-testid="spell-transport" className={s.transport}>
    <div className={s.leading}>{leading}</div>
    <div className={s.center}>
      {mounted && (
        <>
          <Control data-testid="spell-transport-previous" icon={faBackwardStep} label={labels.previous} onClick={onPrevious} disabled={!canPrevious} />
          <Control
            data-testid="spell-transport-toggle"
            icon={isPlaying ? faPause : faPlay}
            label={isPlaying ? labels.pause : labels.play}
            onClick={onTogglePlay}
            primary
          />
          <Control data-testid="spell-transport-next" icon={faForwardStep} label={labels.next} onClick={onNext} disabled={!canNext} />
        </>
      )}
    </div>
    <div className={s.end}>
      {mounted
        ? <Control data-testid="spell-transport-unmount" icon={faEject} label={labels.unmount} onClick={onUnmount} />
        : <Control data-testid="spell-transport-mount" icon={faRightToBracket} label={labels.mount} onClick={onMount} />}
    </div>
  </div>
);
