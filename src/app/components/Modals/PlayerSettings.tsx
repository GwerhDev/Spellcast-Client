import React from 'react';
import { TabModal } from './TabModal';
import { PlayerPreferences } from './PlayerPreferences';
import { faWrench } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../../../i18n';

interface PlayerSettingsProps {
  show: boolean;
  onClose: () => void;
}

export const PlayerSettings: React.FC<PlayerSettingsProps> = ({ show, onClose }) => {
  const { t } = useLanguage();
  return (
    <TabModal
      show={show}
      onClose={onClose}
      title={t.player.playerSettings}
      tabs={[
        {
          icon: faWrench,
          label: t.player.preferencesTab,
          content: <PlayerPreferences />,
        },
      ]}
    />
  );
};
