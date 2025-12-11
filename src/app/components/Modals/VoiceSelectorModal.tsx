import React, { useState } from 'react';
import s from './VoiceSelectorModal.module.css';
import { IconButton } from '../Buttons/IconButton';
import { faBrain, faCircle, faDesktop, faXmark } from '@fortawesome/free-solid-svg-icons';
import { faCircle as faRegCircle } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface Voice {
  voice_id: string;
  name: string;
}

interface VoiceSelectorModalProps {
  browserVoices: Voice[];
  aiVoices: Voice[];
  selectedVoice: Voice | null;
  setSelectedVoice: (voice: Voice) => void;
  onClose: () => void;
  show: boolean;
}

export const VoiceSelectorModal: React.FC<VoiceSelectorModalProps> = ({
  browserVoices,
  aiVoices,
  selectedVoice,
  setSelectedVoice,
  onClose,
  show,
}) => {
  const [activeTab, setActiveTab] = useState<'browser' | 'ai'>('browser');

  if (!show) {
    return null;
  }

  const handleVoiceSelection = (voice: Voice) => {
    setSelectedVoice(voice);
  };

  const voicesToShow = activeTab === 'browser' ? browserVoices : aiVoices;
  const icon = activeTab === 'browser' ? faDesktop : faBrain;

  return (
    <div className={s.container} onClick={onClose}>
      <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
        <IconButton className={s.closeButton} icon={faXmark} onClick={onClose} />
        <h3>Select a Voice</h3>

        <div className={s.tabContainer}>
          <button
            className={`${s.tabButton} ${activeTab === 'browser' ? s.activeTab : ''}`}
            onClick={() => setActiveTab('browser')}
          >
            <FontAwesomeIcon icon={faDesktop} /> Browser Voices
          </button>
          <button
            className={`${s.tabButton} ${activeTab === 'ai' ? s.activeTab : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <FontAwesomeIcon icon={faBrain} /> AI Voices
          </button>
        </div>

        <ul className={s.voiceList}>
          {voicesToShow.map((voiceOption, index) => (
            <li
              key={index}
              className={`${s.voiceOption} ${selectedVoice?.voice_id === voiceOption.voice_id ? s.activeVoice : ''}`}
              onClick={() => handleVoiceSelection(voiceOption)}
            >
              <FontAwesomeIcon icon={selectedVoice?.voice_id === voiceOption.voice_id ? faCircle : faRegCircle} />
              <span>
                {voiceOption.name}
              </span>
              <FontAwesomeIcon icon={icon} className={s.genderIcon} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};