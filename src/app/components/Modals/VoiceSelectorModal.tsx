import s from './VoiceSelectorModal.module.css';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { faBrain, faCircle, faDesktop } from '@fortawesome/free-solid-svg-icons';
import { faCircle as faRegCircle } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Voice, SelectedVoice } from 'src/interfaces';
import { CustomModal } from './CustomModal';

interface VoiceSelectorModalProps {
  browserVoices: Voice[];
  aiVoices: Voice[];
  setSelectedVoice: (voice: Voice) => void;
  onClose: () => void;
  show: boolean;
  reduxSelectedVoice: SelectedVoice; // The actual selected voice from Redux store
}

export const VoiceSelectorModal: React.FC<VoiceSelectorModalProps> = ({
  browserVoices,
  aiVoices,
  setSelectedVoice,
  onClose,
  show,
  reduxSelectedVoice,
}) => {
  const [activeTab, setActiveTab] = useState<'browser' | 'ai'>(reduxSelectedVoice.type === 'ia' ? 'ai' : reduxSelectedVoice.type);

  useEffect(() => {
    setActiveTab(reduxSelectedVoice.type === 'ia' ? 'ai' : reduxSelectedVoice.type);
  }, [reduxSelectedVoice.type]);

  if (!show) {
    return null;
  }

  const handleVoiceSelection = (voice: Voice) => {
    setSelectedVoice(voice);
  };

  const voicesToShow = activeTab === 'browser' ? browserVoices : aiVoices;
  const icon = activeTab === 'browser' ? faDesktop : faBrain;

  return (
    <CustomModal title="Select a Voice" show={show} onClose={onClose}>
      <div className={s.tabContainer}>
        <button
          className={`${s.tabButton} ${s.left} ${activeTab === 'browser' ? s.activeTab : ''}`}
          onClick={() => setActiveTab('browser')}
        >
          <FontAwesomeIcon icon={faDesktop} />
          <span className={s.title}>Browser Voices</span>
        </button>
        <button
          className={`${s.tabButton}  ${s.right} ${activeTab === 'ai' ? s.activeTab : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          <FontAwesomeIcon icon={faBrain} />
          <span className={s.title}>AI Voices</span>
        </button>
      </div>

      <div className={s.descriptionContainer}>
        {activeTab === 'browser' ? (
          <p className={s.description}>
            These voices are provided by your browser. {" "}
            <a href="https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices" target="_blank" rel="noopener noreferrer">
              Check out the available voices in your browser.
            </a>
          </p>
        ) : (
          <p className={s.description}>
            These voices are provided by AI services. Configure your credentials in{' '}
            <Link onClick={onClose} to="/user/settings/credentials">
              your credentials settings.
            </Link>
          </p>
        )}
      </div>

      <ul className={s.voiceList}>
        {voicesToShow.map((voiceOption, index) => (
          <li
            key={index}
            className={`${s.voiceOption} ${reduxSelectedVoice.value === voiceOption.value && (reduxSelectedVoice.type === 'ia' ? 'ai' : reduxSelectedVoice.type) === activeTab ? s.activeVoice : ''}`}
            onClick={() => handleVoiceSelection(voiceOption)}
          >
            <FontAwesomeIcon icon={reduxSelectedVoice.value === voiceOption.value && (reduxSelectedVoice.type === 'ia' ? 'ai' : reduxSelectedVoice.type) === activeTab ? faCircle : faRegCircle} />
            <span>
              {voiceOption.label}
            </span>
            <FontAwesomeIcon icon={icon} className={s.genderIcon} />
          </li>
        ))}
      </ul>
    </CustomModal>
  );
};