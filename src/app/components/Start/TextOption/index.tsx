import s from './index.module.css';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/index';
import { textToSpeechService } from '../../../../services/tts';
import { pause as pauseGlobalBrowser } from '../../../../store/browserPlayerSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faSpinner } from '@fortawesome/free-solid-svg-icons';

export const TextOption: React.FC = () => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const { selectedVoice } = useSelector((state: RootState) => state.voice);
  const dispatch = useDispatch();

  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const sentencesRef = useRef<string[]>([]);
  const sentenceIndexRef = useRef(0);
  const browserVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (selectedVoice.type !== 'browser') return;
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      browserVoiceRef.current =
        voices.find(v => v.name === selectedVoice.value) ||
        voices.find(v => v.default) ||
        voices[0] ||
        null;
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, [selectedVoice]);

  useEffect(() => {
    return () => { if (isPlayingRef.current) stopLocal(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    activeUtteranceRef.current = utterance;
    if (browserVoiceRef.current) utterance.voice = browserVoiceRef.current;

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
      if (selectedVoice.type === 'browser') {
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
      if (selectedVoice.type === 'browser') {
        speakNext(sentencesRef.current, sentenceIndexRef.current);
      } else {
        audioRef.current?.play();
      }
      return;
    }

    // Fresh start — cancel any previous local and global browser speech
    activeUtteranceRef.current = null;
    window.speechSynthesis.cancel();
    dispatch(pauseGlobalBrowser());

    if (selectedVoice.type === 'browser') {
      const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
      sentencesRef.current = sentences.length > 0 ? sentences : [text.trim()];
      sentenceIndexRef.current = 0;
      isPlayingRef.current = true;
      setIsPlaying(true);
      speakNext(sentencesRef.current, 0);
    } else {
      setIsLoading(true);
      try {
        const blob = await textToSpeechService({ text, voice: selectedVoice.value });
        const url = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
        const audio = new Audio(url);
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

  return (
    <form className={s.form} onSubmit={(e) => e.preventDefault()}>
      <div className={s.textareaWrapper}>
        <textarea
          className={s.textarea}
          placeholder="Enter text to convert to speech..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isLoading}
          rows={6}
        />
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
    </form>
  );
};
