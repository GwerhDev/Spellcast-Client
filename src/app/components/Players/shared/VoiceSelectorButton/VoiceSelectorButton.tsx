import s from './VoiceSelectorButton.module.css';
import React from 'react';
import { faCommentDots, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { Tag } from '../../../Tag/Tag';

export type CredentialError = 'quota' | 'auth' | 'unknown';

interface VoiceSelectorButtonProps {
  onClick: () => void;
  // Only ever set by AudioPlayer (its voices carry AI credentials that can fail);
  // BrowserPlayer never passes it, which naturally falls back to the plain-voice-label
  // rendering below — no branching needed per player type.
  credentialError?: CredentialError | null;
}

// Shared by both AudioPlayer and BrowserPlayer (Phase 3a of the button-consistency plan).
// Previously two near-duplicate copies; this one is the AudioPlayer version's strict
// superset, since `selectedVoice.type` is always 'browser' in BrowserPlayer's usage, making
// `isAi` false there and producing the exact same tone="default" render it had before.
export const VoiceSelectorButton: React.FC<VoiceSelectorButtonProps> = ({ onClick, credentialError }) => {
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const isAi = selectedVoice.type === 'ai';
  const voiceLabel = selectedVoice.value !== 'default' && selectedVoice.value !== 'browser'
    ? (selectedVoice.value.split('-').pop() ?? selectedVoice.value).replace('Neural', '').slice(0, 9)
    : 'Browser';

  return (
    <button
      data-testid="voice-selector-button"
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
