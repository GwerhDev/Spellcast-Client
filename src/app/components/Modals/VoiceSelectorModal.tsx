import s from './VoiceSelectorModal.module.css';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { faBrain, faCircle, faDesktop } from '@fortawesome/free-solid-svg-icons';
import { faCircle as faRegCircle } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CustomModal } from './CustomModal';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/index';
import { setSelectedVoice } from 'store/voiceSlice';


interface VoiceSelectorModalProps {
  onClose: () => void;
  show: boolean;
}

export const VoiceSelectorModal: React.FC<VoiceSelectorModalProps> = ({ onClose, show }) => {
  const dispatch = useDispatch();
  const { credentials } = useSelector((state: RootState) => state.credentials);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const [activeTab, setActiveTab] = useState<'browser' | 'ai'>(selectedVoice.type === 'ai' ? 'ai' : selectedVoice.type);

  useEffect(() => {
    setActiveTab(selectedVoice.type === 'ai' ? 'ai' : selectedVoice.type);
  }, [selectedVoice.type]);

  const voices = window.speechSynthesis.getVoices();

  const aiVoices = credentials?.[0]?.voices?.map(v => ({ value: v.value, label: v.label, gender: v.gender })) || [];
  const browserVoices = voices.map(v => ({ value: v.name, label: v.name, gender: 'Unknown', isBrowser: true }));

  const voicesToShow = activeTab === 'browser' ? browserVoices : aiVoices;
  const icon = activeTab === 'browser' ? faDesktop : faBrain;

  const handleVoiceSelection = async (selected: { value: string, label: string, gender: string, isBrowser?: boolean }) => {
    onClose();
    if (selected?.isBrowser) {
      dispatch(setSelectedVoice({ value: selected.value, type: 'browser' }));
      localStorage.setItem('default_browser_voice', JSON.stringify({ value: selected.value, type: 'browser' }));
    } else {
      dispatch(setSelectedVoice({ value: selected.value, type: 'ai' }));
    }
  };

  if (!show) {
    return null;
  }

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
            className={`${s.voiceOption} ${selectedVoice.value === voiceOption.value && (selectedVoice.type === 'ai' ? 'ai' : selectedVoice.type) === activeTab ? s.activeVoice : ''}`}
            onClick={() => handleVoiceSelection(voiceOption)}
          >
            <FontAwesomeIcon icon={selectedVoice.value === voiceOption.value && (selectedVoice.type === 'ai' ? 'ai' : selectedVoice.type) === activeTab ? faCircle : faRegCircle} />
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