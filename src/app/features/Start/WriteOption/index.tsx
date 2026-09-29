import s from '../../../components/Start/WriteOption/index.module.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { textToSpeechService } from '../../../../services/tts';
import { selectCurrentCredential } from '../../../../store/credentialsSlice';
import { pause as pauseGlobalBrowser } from '../../../../store/browserPlayerSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay, faPause, faSpinner,
  faVolumeUp, faVolumeMute,
  faPlug, faDesktop,
} from '@fortawesome/free-solid-svg-icons';
import { CustomModal } from '../../../components/Modals/CustomModal';
import { VoiceSelectorContent } from '../../VoiceSelectorContent';
import { useLanguage } from '../../../../i18n';

export const WriteOption: React.FC = () => {
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

  const volumeRef = useRef(1);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const volumeButtonRef = useRef<HTMLButtonElement>(null);

  // Same credential the voice selector lists (the active one), so the default provider
  // voice picked here is always one it shows.
  const activeCredential = useSelector(selectCurrentCredential);
  const aiVoices = useMemo(
    () => activeCredential?.voices?.map(v => ({ value: v.value, name: v.name })) ?? [],
    [activeCredential]
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
        const { blob } = await textToSpeechService({ text, voice: selectedVoiceValue });
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

  return (
    <>
      <form data-testid="write-option-form" className={s.form} onSubmit={(e) => e.preventDefault()}>
        <div className={s.textareaWrapper}>
          <textarea
            data-testid="write-option-textarea"
            className={s.textarea}
            placeholder={t.player.enterText}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isLoading}
            rows={6}
          />
          <div className={s.toolbar}>
            <div className={s.voiceInfo}>
              <span
                data-testid="write-option-voice-btn"
                className={s.voiceInfoTrigger}
                onClick={() => setShowVoiceModal(true)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowVoiceModal(true); } }}
                role="button"
                tabIndex={0}
              >
                <FontAwesomeIcon icon={voiceType === 'browser' ? faDesktop : faPlug} className={s.voiceInfoIcon} />
                <span className={s.voiceInfoName}>
                  {voiceType === 'browser'
                    ? (browserVoices.find(v => v.name === selectedVoiceValue)?.name ?? selectedVoiceValue)
                    : (aiVoices.find(v => v.value === selectedVoiceValue)?.name ?? selectedVoiceValue)
                  }
                </span>
              </span>
            </div>
            <div className={s.toolbarButtons}>
              <div className={s.volumeContainer}>
                <span className={s.iconFixed}>
                  <button
                    type="button"
                    className={s.toolbarBtn}
                    ref={volumeButtonRef}
                    onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                    title={t.player.volume}
                  >
                    <FontAwesomeIcon icon={volume === 0 ? faVolumeMute : faVolumeUp} />
                  </button>
                </span>
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
              <span className={s.iconFixed}>
                <button
                  data-testid="write-option-play-btn"
                  type="button"
                  className={s.submitButton}
                  disabled={isLoading || !text.trim()}
                  onClick={handleClick}
                >
                  <FontAwesomeIcon icon={isLoading ? faSpinner : isPlaying ? faPause : faPlay} spin={isLoading} />
                </button>
              </span>
            </div>
          </div>
        </div>
      </form>

      <CustomModal title={t.player.selectVoice} show={showVoiceModal} onClose={() => setShowVoiceModal(false)}>
        <VoiceSelectorContent
          onClose={() => setShowVoiceModal(false)}
          selected={{ value: selectedVoiceValue, type: voiceType }}
          onSelect={voice => handleVoiceSelect(voice.type, voice.value)}
        />
      </CustomModal>
    </>
  );
};
