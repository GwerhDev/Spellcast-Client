import s from '../../components/Modals/VoiceSelectorModal.module.css';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { faBrain, faCircle, faDesktop, faVolumeHigh, faStop, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { faCircle as faRegCircle } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { setSelectedVoice } from '../../../store/voiceSlice';
import { stop as stopAudio } from '../../../store/audioPlayerSlice';
import { stop as stopBrowser } from '../../../store/browserPlayerSlice';
import { saveVoicePreference } from '../../../db/preferences';
import { useLanguage } from '../../../i18n';

function getBrowserVoiceDocs(): { label: string; url: string } {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua))
    return { label: 'Edge', url: 'https://support.microsoft.com/en-us/topic/use-natural-voices-for-read-aloud-in-microsoft-edge-4c7abe20-f044-4c17-b8c4-9498b9b4f758' };
  if (/Chrome\//.test(ua))
    return { label: 'Chrome', url: 'https://support.google.com/chrome/answer/7692980' };
  if (/Firefox\//.test(ua))
    return { label: 'Firefox', url: 'https://support.mozilla.org/kb/accessibility-features-firefox' };
  if (/Safari\//.test(ua))
    return { label: 'Safari', url: 'https://support.apple.com/guide/mac-help/change-voice-mac-uses-speak-text-mchlp2290/mac' };
  return { label: 'your browser', url: 'https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices' };
}

interface VoiceSelectorContentProps {
  onClose: () => void;
}

export const VoiceSelectorContent: React.FC<VoiceSelectorContentProps> = ({ onClose }) => {
  const browserVoiceDocs = getBrowserVoiceDocs();
  const dispatch = useDispatch();
  const { credentials, loading: credentialsLoading } = useSelector((state: RootState) => state.credentials);
  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const userId = useSelector((state: RootState) => state.session.userData?.id);
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'browser' | 'ai'>(selectedVoice.type === 'ai' ? 'ai' : selectedVoice.type);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(selectedVoice.type === 'ai' ? 'ai' : selectedVoice.type);
  }, [selectedVoice.type]);

  const voices = window.speechSynthesis.getVoices();
  const aiVoices = credentials?.[0]?.voices?.map(v => ({ value: v.value, name: v.name, gender: v.gender })) || [];
  const browserVoices = voices.map(v => ({ value: v.name, name: v.name, gender: 'Unknown', isBrowser: true }));
  const voicesToShow = activeTab === 'browser' ? browserVoices : aiVoices;
  const icon = activeTab === 'browser' ? faDesktop : faBrain;

  const handlePreview = (e: React.MouseEvent, voiceName: string) => {
    e.stopPropagation();
    window.speechSynthesis.cancel();
    if (previewingVoice === voiceName) {
      setPreviewingVoice(null);
      return;
    }
    const utter = new SpeechSynthesisUtterance('This is a preview of this voice.');
    const voice = window.speechSynthesis.getVoices().find(v => v.name === voiceName);
    if (voice) utter.voice = voice;
    utter.onend = () => setPreviewingVoice(null);
    setPreviewingVoice(voiceName);
    window.speechSynthesis.speak(utter);
  };

  const handleVoiceSelection = async (selected: { value: string; name: string; gender: string; isBrowser?: boolean }) => {
    onClose();
    const newVoice = { value: selected.value, type: selected.isBrowser ? 'browser' : 'ai' } as const;
    if (newVoice.type !== selectedVoice.type) {
      window.speechSynthesis.cancel();
      dispatch(stopBrowser());
      dispatch(stopAudio());
    }
    dispatch(setSelectedVoice(newVoice));
    if (userId) await saveVoicePreference(userId, newVoice);
  };

  return (
    <>
      <div className={s.tabContainer}>
        <button
          className={`${s.tabButton} ${s.left} ${activeTab === 'browser' ? s.activeTab : ''}`}
          onClick={() => setActiveTab('browser')}
        >
          <FontAwesomeIcon icon={faDesktop} />
          <span className={s.title}>{t.player.browserVoices}</span>
        </button>
        <button
          className={`${s.tabButton} ${s.right} ${activeTab === 'ai' ? s.activeTab : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          <FontAwesomeIcon icon={faBrain} />
          <span className={s.title}>{t.player.aiVoices}</span>
        </button>
      </div>

      <div className={s.descriptionContainer}>
        {activeTab === 'browser' ? (
          <p className={s.description}>
            {t.player.browserVoicesDesc}{' '}
            <a href={browserVoiceDocs.url} target="_blank" rel="noopener noreferrer">
              {t.player.checkBrowserVoices.replace('{browser}', browserVoiceDocs.label)}
            </a>
          </p>
        ) : (
          <p className={s.description}>
            {t.player.aiVoicesDesc}{' '}
            <Link onClick={onClose} to="/user/settings/credentials">{t.player.credentialsSettings}</Link>
          </p>
        )}
      </div>

      {activeTab === 'ai' && credentialsLoading ? (
        <div className={s.loaderContainer}>
          <FontAwesomeIcon icon={faSpinner} spin />
        </div>
      ) : null}

      <ul className={s.voiceList}>
        {(!credentialsLoading || activeTab === 'browser') && voicesToShow.map((voiceOption, index) => (
          <li
            key={index}
            className={`${s.voiceOption} ${
              selectedVoice.value === voiceOption.value &&
              (selectedVoice.type === 'ai' ? 'ai' : selectedVoice.type) === activeTab
                ? s.activeVoice : ''
            }`}
            onClick={() => handleVoiceSelection(voiceOption)}
          >
            <FontAwesomeIcon
              icon={
                selectedVoice.value === voiceOption.value &&
                (selectedVoice.type === 'ai' ? 'ai' : selectedVoice.type) === activeTab
                  ? faCircle : faRegCircle
              }
            />
            <span>{voiceOption.name}</span>
            <FontAwesomeIcon icon={icon} className={s.genderIcon} />
            {activeTab === 'browser' && (
              <button
                className={s.previewButton}
                onClick={(e) => handlePreview(e, voiceOption.name)}
                title={t.player.previewVoice}
              >
                <FontAwesomeIcon icon={previewingVoice === voiceOption.name ? faStop : faVolumeHigh} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
};
