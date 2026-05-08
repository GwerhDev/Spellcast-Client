import React from 'react';
import { TabModal } from './TabModal';
import { VoiceSelectorContent } from './VoiceSelectorContent';
import { PlayerPreferences } from './PlayerPreferences';
import { faCommentDots, faWrench } from '@fortawesome/free-solid-svg-icons';

interface PlayerSettingsProps {
  show: boolean;
  onClose: () => void;
}

export const PlayerSettings: React.FC<PlayerSettingsProps> = ({ show, onClose }) => {
  return (
    <TabModal
      show={show}
      onClose={onClose}
      title="Player Settings"
      tabs={[
        {
          icon: faCommentDots,
          label: 'Voice',
          content: <VoiceSelectorContent onClose={onClose} />,
        },
        {
          icon: faWrench,
          label: 'Preferences',
          content: <PlayerPreferences />,
        },
      ]}
    />
  );
};
