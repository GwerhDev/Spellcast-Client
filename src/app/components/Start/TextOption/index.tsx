import s from './index.module.css';
import mVoice from '../../Modals/VoiceSelectorModal.module.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/index';
import { textToSpeechService } from '../../../../services/tts';
import { pause as pauseGlobalBrowser } from '../../../../store/browserPlayerSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay, faPause, faSpinner,
  faCommentDots, faVolumeUp, faVolumeMute, faVolumeHigh, faStop,
  faBrain, faDesktop, faCircle as faFilledCircle,
} from '@fortawesome/free-solid-svg-icons';
import { faCircle as faRegCircle } from '@fortawesome/free-regular-svg-icons';
import { CustomModal } from '../../Modals/CustomModal';
import { useLanguage } from '../../../../i18n';

export const TextOption: React.FC = () => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { t } = useLanguage();

  const [voiceType, setVoiceType] = useState<'browser' | 'ai'>('browser');
  const [selectedVoiceValue, setSelectedVoiceValue] = useState('');
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [modalTab, setModalTab] = useState<'browser' | 'ai'>('browser');
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const volumeRef = useRef(1);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const volumeButtonRef = useRef<HTMLButtonElement>(null);

  const { credentials } = useSelector((state: RootState) => state.credentials);
  const aiVoices = useMemo(
    () => credentials?.[0]?.voices?.map(v => ({ value: v.value, name: v.name })) ?? [],
    [credentials]
  );
  const dispatch = useDispatch();

  useEffect(() => {
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      setBrowserVoices(voices);
      if (voices.length > 0 && !selectedVoiceValue) {
        const def = voices.find(v => v.default) ?? voices[0];
        setSelectedVoiceValue(def.name);
      }
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  useEffect(() => {
    if (voiceType === 'ai' && aiVoices.length > 0 && !selectedVoiceValue) {
      setSelectedVoiceValue(aiVoices[0].value);
    }
  }, [voiceType, aiVoices]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showVolumeSlider &&
        volumeSliderRef.current &&
        !volumeSliderRef.current.contains(event.target as Node) &&
        volumeButtonRef.current &&
        !volumeButtonRef.current.contains(event.target as Node)
      ) {
        setShowVolumeSlider(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVolumeSlider]);

  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const sentencesRef = useRef<string[]>([]);
  const sentenceIndexRef = useRef(0);

  useEffect(() => {
    return () => { if (isPlayingRef.current) stopLocal(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    volumeRef.current = val;
    if (audioRef.current) audioRef.current.volume = val;
  };

  const currentBrowserVoice = () =>
    browserVoices.find(v => v.name === selectedVoiceValue)
    ?? browserVoices.find(v => v.default)
    ?? browserVoices[0]
    ?? null;

  const stopLocal = () => {
    isPlayingRef.current = false;
    isPausedRef.current = false;
    activeUtteranceRef.current = null;
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setIsPlaying(false);
  };

  const speakNext = (sentences: string[], index: number) => {
    sentenceIndexRef.current = index;
    if (!isPlayingRef.current || index >= sentences.length) {
      isPlayingRef.current = false;
      isPausedRef.current = false;
      setIsPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(sentences[index]);
    utterance.volume = volumeRef.current;
    activeUtteranceRef.current = utterance;
    const voice = currentBrowserVoice();
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      if (activeUtteranceRef.current !== utterance) return;
      speakNext(sentences, index + 1);
    };
    utterance.onerror = (e) => {
      if (activeUtteranceRef.current !== utterance) return;
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      speakNext(sentences, index + 1);
    };
    window.speechSynthesis.speak(utterance);
  };

  const handleClick = async () => {
    if (!text.trim() || isLoading) return;

    if (isPlaying) {
      if (voiceType === 'browser') {
        activeUtteranceRef.current = null;
        window.speechSynthesis.cancel();
      } else {
        audioRef.current?.pause();
      }
      isPlayingRef.current = false;
      isPausedRef.current = true;
      setIsPlaying(false);
      return;
    }

    if (isPausedRef.current) {
      isPausedRef.current = false;
      isPlayingRef.current = true;
      setIsPlaying(true);
      if (voiceType === 'browser') {
        speakNext(sentencesRef.current, sentenceIndexRef.current);
      } else {
        audioRef.current?.play();
      }
      return;
    }

    activeUtteranceRef.current = null;
    window.speechSynthesis.cancel();
    dispatch(pauseGlobalBrowser());

    if (voiceType === 'browser') {
      const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
      sentencesRef.current = sentences.length > 0 ? sentences : [text.trim()];
      sentenceIndexRef.current = 0;
      isPlayingRef.current = true;
      setIsPlaying(true);
      speakNext(sentencesRef.current, 0);
    } else {
      setIsLoading(true);
      try {
        const blob = await textToSpeechService({ text, voice: selectedVoiceValue });
        const url = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
        const audio = new Audio(url);
        audio.volume = volumeRef.current;
        audioRef.current = audio;
        audio.onended = () => {
          isPlayingRef.current = false;
          isPausedRef.current = false;
          setIsPlaying(false);
        };
        audio.play();
        isPlayingRef.current = true;
        setIsPlaying(true);
      } catch (err) {
        console.error('TTS failed:', err);
        isPlayingRef.current = false;
        setIsPlaying(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleVoiceSelect = (type: 'browser' | 'ai', value: string) => {
    if (isPlaying) stopLocal();
    setVoiceType(type);
    setSelectedVoiceValue(value);
    setShowVoiceModal(false);
  };

  const handleModalPreview = (e: React.MouseEvent, voiceName: string) => {
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

  return (
    <>
      <form className={s.form} onSubmit={(e) => e.preventDefault()}>
        <div className={s.textareaWrapper}>
          <textarea
            className={s.textarea}
            placeholder={t.player.enterText}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isLoading}
            rows={6}
          />
          <div className={s.toolbar}>
            <div className={s.voiceInfo}>
              <FontAwesomeIcon
                icon={voiceType === 'browser' ? faDesktop : faBrain}
                className={s.voiceInfoIcon}
              />
              <span className={s.voiceInfoName}>
                {voiceType === 'browser'
                  ? (browserVoices.find(v => v.name === selectedVoiceValue)?.name ?? selectedVoiceValue)
                  : (aiVoices.find(v => v.value === selectedVoiceValue)?.name ?? selectedVoiceValue)
                }
              </span>
            </div>
            <div className={s.toolbarButtons}>
              <button
                type="button"
                className={s.toolbarBtn}
                onClick={() => setShowVoiceModal(true)}
                title={t.player.selectVoice}
              >
                <FontAwesomeIcon icon={faCommentDots} />
              </button>
              <div className={s.volumeContainer}>
                <button
                  type="button"
                  className={s.toolbarBtn}
                  ref={volumeButtonRef}
                  onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                  title={t.player.volume}
                >
                  <FontAwesomeIcon icon={volume === 0 ? faVolumeMute : faVolumeUp} />
                </button>
                {showVolumeSlider && (
                  <div
                    className={s.volumePopup}
                    style={{ '--volume-value': `${volume * 100}%` } as React.CSSProperties}
                    ref={volumeSliderRef}
                  >
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className={s.verticalSlider}
                    />
                  </div>
                )}
              </div>
              <button
                type="button"
                className={s.submitButton}
                disabled={isLoading || !text.trim()}
                onClick={handleClick}
              >
                <FontAwesomeIcon
                  icon={isLoading ? faSpinner : isPlaying ? faPause : faPlay}
                  spin={isLoading}
                />
              </button>
            </div>
          </div>
        </div>
      </form>

      <CustomModal title={t.player.selectVoice} show={showVoiceModal} onClose={() => setShowVoiceModal(false)}>
        <div className={mVoice.tabContainer}>
          <button
            className={`${mVoice.tabButton} ${mVoice.left} ${modalTab === 'browser' ? mVoice.activeTab : ''}`}
            onClick={() => setModalTab('browser')}
          >
            <FontAwesomeIcon icon={faDesktop} />
            <span className={mVoice.title}>{t.player.browserVoices}</span>
          </button>
          <button
            className={`${mVoice.tabButton} ${mVoice.right} ${modalTab === 'ai' ? mVoice.activeTab : ''}`}
            onClick={() => setModalTab('ai')}
          >
            <FontAwesomeIcon icon={faBrain} />
            <span className={mVoice.title}>{t.player.aiVoices}</span>
          </button>
        </div>
        <ul className={mVoice.voiceList}>
          {modalTab === 'browser' ? (
            browserVoices.map((v) => (
              <li
                key={v.name}
                className={`${mVoice.voiceOption} ${voiceType === 'browser' && selectedVoiceValue === v.name ? mVoice.activeVoice : ''}`}
                onClick={() => handleVoiceSelect('browser', v.name)}
              >
                <FontAwesomeIcon icon={voiceType === 'browser' && selectedVoiceValue === v.name ? faFilledCircle : faRegCircle} />
                <span>{v.name}</span>
                <FontAwesomeIcon icon={faDesktop} className={mVoice.genderIcon} />
                <button
                  className={mVoice.previewButton}
                  onClick={(e) => handleModalPreview(e, v.name)}
                  title={t.player.previewVoice}
                >
                  <FontAwesomeIcon icon={previewingVoice === v.name ? faStop : faVolumeHigh} />
                </button>
              </li>
            ))
          ) : (
            aiVoices.map((v) => (
              <li
                key={v.value}
                className={`${mVoice.voiceOption} ${voiceType === 'ai' && selectedVoiceValue === v.value ? mVoice.activeVoice : ''}`}
                onClick={() => handleVoiceSelect('ai', v.value)}
              >
                <FontAwesomeIcon icon={voiceType === 'ai' && selectedVoiceValue === v.value ? faFilledCircle : faRegCircle} />
                <span>{v.name}</span>
                <FontAwesomeIcon icon={faBrain} className={mVoice.genderIcon} />
              </li>
            ))
          )}
        </ul>
      </CustomModal>
    </>
  );
};
