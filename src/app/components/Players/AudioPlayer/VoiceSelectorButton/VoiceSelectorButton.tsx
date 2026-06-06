import s from './VoiceSelectorButton.module.css';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { Tag } from '../../../Tag/Tag';

export type CredentialError = 'quota' | 'auth' | 'unknown';

interface VoiceSelectorButtonProps {
  onClick: () => void;
  credentialError?: CredentialError | null;
}

export const VoiceSelectorButton: React.FC<VoiceSelectorButtonProps> = ({ onClick, credentialError }) => {
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const isAi = selectedVoice.type === 'ai';
  const voiceLabel = selectedVoice.value !== 'default' && selectedVoice.value !== 'browser'
    ? (selectedVoice.value.split('-').pop() ?? selectedVoice.value).replace('Neural', '').slice(0, 9)
    : 'Browser';

  return (
    <div className={s.voiceSelectorContainer}>
      <button
        className={s.voiceButton}
        onClick={onClick}
        title={credentialError ? 'Credential error — click to change' : voiceLabel}
      >
        <span className={s.iconRow}>
          <FontAwesomeIcon icon={faCommentDots} />
          {credentialError && (
            <FontAwesomeIcon icon={faTriangleExclamation} className={s.errorIcon} title={
              credentialError === 'quota' ? 'Azure quota exceeded' :
              credentialError === 'auth'  ? 'Invalid credential' : 'Synthesis error'
            } />
          )}
        </span>
        <span className={s.voiceLabel}>
          {!credentialError && (
            <Tag tone={isAi ? 'primary' : 'default'} size="sm">
              {voiceLabel}
            </Tag>
          )}
          {credentialError && (
            <Tag tone="warning" size="sm">Error</Tag>
          )}
        </span>
      </button>
    </div>
  );
};
