import { useDispatch } from 'react-redux';
import { useAppSelector } from '../store/hooks';
import { setAutoPlayOnLoad, resetBrowserPlayer, requestTogglePlay } from '../store/browserPlayerSlice';
import { setAutoPlayOnLoad as setAudioAutoPlayOnLoad, resetAudioPlayer, requestTogglePlay as requestAudioTogglePlay } from '../store/audioPlayerSlice';
import { setSpellFile, setSpellInfo, resetSpellReader } from '../store/spellReaderSlice';
import type { Spell } from '../interfaces';

// Starts reading a spell in the persistent player (mounted in DefaultLayout), without
// navigating: it autoplays as soon as the reader state is set. If that spell is already the
// one loaded, toggles play/pause instead of restarting it.
export const usePlaySpell = () => {
  const dispatch = useDispatch();
  const { spellId: activeSpellId, isLoaded: readerLoaded } = useAppSelector(state => state.spellReader);
  const audioPlaying = useAppSelector(state => state.audioPlayer.isPlaying);
  const browserPlaying = useAppSelector(state => state.browserPlayer.isPlaying);
  const selectedVoiceType = useAppSelector(state => state.voice.selectedVoice.type);

  const togglePlayback = () => {
    if (selectedVoiceType !== 'browser') dispatch(requestAudioTogglePlay());
    else dispatch(requestTogglePlay());
  };

  const playSpell = (spell: Spell) => {
    if (activeSpellId === spell.id && (readerLoaded || audioPlaying || browserPlaying)) {
      togglePlayback();
      return;
    }
    const totalPages = spell.pagesContent ? (() => { try { return JSON.parse(spell.pagesContent!).length; } catch { return 1; } })() : 1;
    dispatch(resetSpellReader());
    dispatch(resetBrowserPlayer());
    dispatch(resetAudioPlayer());
    dispatch(setAutoPlayOnLoad(true));
    dispatch(setAudioAutoPlayOnLoad(true));
    dispatch(setSpellFile({ id: spell.id, title: spell.title, progress: spell.progress }));
    dispatch(setSpellInfo({ totalPages }));
  };

  return { playSpell, togglePlayback };
};
