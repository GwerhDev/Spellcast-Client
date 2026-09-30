import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookBookmark, faFeatherPointed } from '@fortawesome/free-solid-svg-icons';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import s from './GrimoireStatus.module.css';

interface GrimoireStatusProps {
  inGrimoire: boolean;
  inGrimoireLabel: string;
  transcribeLabel: string;
  // Transcribing copies a spell someone else shares into the caster's own grimoire. Without
  // a handler (nothing to transcribe yet) the action isn't offered.
  onTranscribe?: () => void;
}

// Whether a spell is part of the caster's grimoire: a badge when it is, the action to
// transcribe it there when it isn't.
export const GrimoireStatus = ({ inGrimoire, inGrimoireLabel, transcribeLabel, onTranscribe }: GrimoireStatusProps) => {
  if (inGrimoire) {
    return (
      <span data-testid="grimoire-status-in" className={s.badge}>
        <FontAwesomeIcon icon={faBookBookmark} />
        {inGrimoireLabel}
      </span>
    );
  }
  if (!onTranscribe) return null;
  return (
    <PrimaryButton data-testid="grimoire-status-transcribe" className={s.action} icon={faFeatherPointed} onClick={onTranscribe}>
      {transcribeLabel}
    </PrimaryButton>
  );
};
