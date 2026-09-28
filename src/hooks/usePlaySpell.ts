import { useDispatch } from 'react-redux';
import { useAppSelector } from '../store/hooks';
import { setAutoPlayOnLoad, resetBrowserPlayer, requestTogglePlay, requestResume } from '../store/browserPlayerSlice';
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

  const isLoaded = (spell: Spell) => activeSpellId === spell.id && (readerLoaded || audioPlaying || browserPlaying);

  const loadAndPlay = (spell: Spell) => {
    const totalPages = spell.pagesContent ? (() => { try { return JSON.parse(spell.pagesContent!).length; } catch { return 1; } })() : 1;
    dispatch(resetSpellReader());
    dispatch(resetBrowserPlayer());
    dispatch(resetAudioPlayer());
    dispatch(setAutoPlayOnLoad(true));
    dispatch(setAudioAutoPlayOnLoad(true));
    dispatch(setSpellFile({ id: spell.id, title: spell.title, progress: spell.progress }));
    dispatch(setSpellInfo({ totalPages }));
  };

  // A play button: the already-loaded spell toggles play/pause.
  const playSpell = (spell: Spell) => {
    if (isLoaded(spell)) { togglePlayback(); return; }
    loadAndPlay(spell);
  };

  // "Read this" (e.g. dropping a spell to read it): the already-loaded spell keeps playing,
  // or resumes if paused -- never pauses.
  const readSpell = (spell: Spell) => {
    if (!isLoaded(spell)) { loadAndPlay(spell); return; }
    if (audioPlaying || browserPlaying) return;
    // The browser player's resume is a no-op if it's already playing; the AI player only
    // has a toggle, which is safe here because it was just checked to be paused.
    if (selectedVoiceType !== 'browser') dispatch(requestAudioTogglePlay());
    else dispatch(requestResume());
  };

  return { playSpell, readSpell, togglePlayback };
};
