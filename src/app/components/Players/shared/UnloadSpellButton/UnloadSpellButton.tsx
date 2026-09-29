import { faEject } from '@fortawesome/free-solid-svg-icons';
import { IconButton } from '../../../Buttons/IconButton';
import s from './UnloadSpellButton.module.css';

interface UnloadSpellButtonProps {
  onClick: () => void;
  title: string;
}

// Shared by AudioPlayer and BrowserPlayer: takes the loaded spell out of the player (which
// then closes). Sits next to VoiceSelectorButton's pill, as one small group.
export const UnloadSpellButton = ({ onClick, title }: UnloadSpellButtonProps) => (
  <IconButton
    data-testid="unload-spell-button"
    icon={faEject}
    title={title}
    className={s.unload}
    onClick={onClick}
  />
);
