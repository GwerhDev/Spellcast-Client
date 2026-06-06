import s from './VoiceSelectorButton.module.css';
import React from 'react';
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
    <button className={s.voiceButton} onClick={onClick} title={voiceLabel}>
      <Tag tone="default" size="sm" icon={faCommentDots}>{voiceLabel}</Tag>
    </button>
  );
};
