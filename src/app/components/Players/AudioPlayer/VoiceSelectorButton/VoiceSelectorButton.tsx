import s from './VoiceSelectorButton.module.css';
import React from 'react';
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
    <button
      className={s.voiceButton}
      onClick={onClick}
      title={credentialError ? 'Credential error — click to change' : voiceLabel}
    >
      {credentialError ? (
        <Tag tone="warning" size="sm" icon={faTriangleExclamation}>Error</Tag>
      ) : (
        <Tag tone={isAi ? 'primary' : 'default'} size="sm" icon={faCommentDots}>
          {voiceLabel}
        </Tag>
      )}
    </button>
  );
};
