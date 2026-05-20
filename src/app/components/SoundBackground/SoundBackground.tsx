import { useEffect, useRef } from 'react';
import { useAppSelector } from 'store/hooks';
import { soundBackgrounds } from '../../../config/assets';

export const SoundBackground = () => {
  const activeSoundBgId = useAppSelector(state => state.userLibrary.activeSoundBgId);
  const soundBgVolume = useAppSelector(state => state.userLibrary.soundBgVolume);
  const masterVolume = useAppSelector(state => state.userLibrary.masterVolume);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (!activeSoundBgId) return;

    const bg = soundBackgrounds.find(b => b.id === activeSoundBgId);
    if (!bg) return;

    const audio = new Audio(bg.streamUrl);
    audio.loop = bg.loop;
    audio.volume = soundBgVolume * masterVolume;
    audio.play().catch(() => {});
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [activeSoundBgId]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = soundBgVolume * masterVolume;
    }
  }, [soundBgVolume, masterVolume]);

  return null;
};
