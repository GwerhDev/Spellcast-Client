import React from 'react';
import { TabModal } from './TabModal';
import { PlayerPreferences } from './PlayerPreferences';
import { faWrench } from '@fortawesome/free-solid-svg-icons';

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
          icon: faWrench,
          label: 'Preferences',
          content: <PlayerPreferences />,
        },
      ]}
    />
  );
};
