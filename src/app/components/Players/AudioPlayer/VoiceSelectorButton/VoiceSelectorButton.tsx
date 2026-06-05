import s from './VoiceSelectorButton.module.css';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

export type CredentialError = 'quota' | 'auth' | 'unknown';

interface VoiceSelectorButtonProps {
  onClick: () => void;
  credentialError?: CredentialError | null;
}

export const VoiceSelectorButton: React.FC<VoiceSelectorButtonProps> = ({ onClick, credentialError }) => {
  return (
    <div className={s.voiceSelectorContainer}>
      <button className={s.voiceButton} onClick={onClick} title={credentialError ? 'Credential error — click to change' : undefined}>
        <FontAwesomeIcon icon={faCommentDots} />
        {credentialError && (
          <span className={s.errorBadge} title={
            credentialError === 'quota'
              ? 'Azure credential has run out of quota'
              : credentialError === 'auth'
              ? 'Azure credential is invalid or unauthorized'
              : 'Synthesis error'
          }>
            <FontAwesomeIcon icon={faTriangleExclamation} />
          </span>
        )}
      </button>
    </div>
  );
};
