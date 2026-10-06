import { useEffect, useRef } from 'react';
import { useAppSelector } from '../../../store/hooks';
import { soundBackgrounds } from '../../../config/assets';
import { useSpellCosmetic } from '../../../hooks/useSpellCosmetic';

// The loaded spell's sound background (its own pick, or the caster's default; see
// useSpellCosmetic), playing while the spell does.
export const SoundBackground = () => {
  const spellId = useAppSelector(state => state.spellReader.spellId);
  const { readyId: activeSoundBgId } = useSpellCosmetic('soundBackground', spellId);
  const soundBgVolume = useAppSelector(state => state.casterInventory.soundBgVolume);
  const masterVolume = useAppSelector(state => state.casterInventory.masterVolume);
  const browserPlaying = useAppSelector(state => state.browserPlayer.isPlaying);
  const audioPlaying = useAppSelector(state => state.audioPlayer.isPlaying);
  const isPlaying = browserPlaying || audioPlaying;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

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
    audioRef.current = audio;
    // Picked (or read) while the spell is already playing: it plays from here.
    if (isPlayingRef.current) audio.play().catch(() => {});

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [activeSoundBgId]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = soundBgVolume * masterVolume;
    }
  }, [soundBgVolume, masterVolume]);

  return null;
};
