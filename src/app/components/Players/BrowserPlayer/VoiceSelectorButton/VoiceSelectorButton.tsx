import s from './VoiceSelectorButton.module.css';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots } from '@fortawesome/free-solid-svg-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { Tag } from '../../../Tag/Tag';

interface VoiceSelectorButtonProps {
  onClick: () => void;
}

export const VoiceSelectorButton: React.FC<VoiceSelectorButtonProps> = ({ onClick }) => {
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const voiceLabel = selectedVoice.value !== 'default' && selectedVoice.value !== 'browser'
    ? (selectedVoice.value.split('-').pop() ?? selectedVoice.value).replace('Neural', '').slice(0, 9)
    : 'Browser';

  return (
    <div className={s.voiceSelectorContainer}>
      <button className={s.voiceButton} onClick={onClick} title={voiceLabel}>
        <span className={s.iconRow}>
          <FontAwesomeIcon icon={faCommentDots} />
        </span>
        <span className={s.voiceLabel}>
          <Tag tone="default" size="sm">{voiceLabel}</Tag>
        </span>
      </button>
    </div>
  );
};
