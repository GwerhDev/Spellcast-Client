import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { spellId: activeSpellId, isLoaded: readerLoaded } = useAppSelector(state => state.spellReader);
  const audioPlaying = useAppSelector(state => state.audioPlayer.isPlaying);
  const browserPlaying = useAppSelector(state => state.browserPlayer.isPlaying);
  const selectedVoiceType = useAppSelector(state => state.voice.selectedVoice.type);

  const togglePlayback = () => {
    if (selectedVoiceType !== 'browser') dispatch(requestAudioTogglePlay());
    else dispatch(requestTogglePlay());
  };

  const isLoaded = (spell: Spell) => activeSpellId === spell.id && (readerLoaded || audioPlaying || browserPlaying);

  const load = (spell: Spell, autoplay: boolean) => {
    const totalPages = spell.pagesContent ? (() => { try { return JSON.parse(spell.pagesContent!).length; } catch { return 1; } })() : 1;
    dispatch(resetSpellReader());
    dispatch(resetBrowserPlayer());
    dispatch(resetAudioPlayer());
    dispatch(setAutoPlayOnLoad(autoplay));
    dispatch(setAudioAutoPlayOnLoad(autoplay));
    dispatch(setSpellFile({ id: spell.id, title: spell.title, userId: spell.userId, progress: spell.progress }));
    dispatch(setSpellInfo({ totalPages }));
  };
  const loadAndPlay = (spell: Spell) => load(spell, true);

  // Loads a spell into the player, paused where it was left, without starting to read it
  // (and without navigating). Already loaded: nothing to do.
  const mountSpell = (spell: Spell) => {
    if (activeSpellId === spell.id) return;
    load(spell, false);
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
    // The browser player's resume is a no-op if it's already playing; the provider voice player only
    // has a toggle, which is safe here because it was just checked to be paused.
    if (selectedVoiceType !== 'browser') dispatch(requestAudioTogglePlay());
    else dispatch(requestResume());
  };

  // Takes the loaded spell out of the player: with no spell loaded the persistent player
  // unmounts (and stops), leaving nothing loaded.
  //
  // In that spell's reader, it leaves the reader first -- the reader loads its spell on its
  // own, so unloading there would only load it right back. It goes to the spell's detail
  // page, or to `leaveReaderTo` (e.g. home, when the spell is being deleted), replacing the
  // reader in the history so going back doesn't reload it either.
  const unloadSpell = ({ leaveReaderTo }: { leaveReaderTo?: string } = {}) => {
    if (activeSpellId && pathname === `/spell/${activeSpellId}/reader`) {
      navigate(leaveReaderTo ?? `/spell/${activeSpellId}`, { replace: true });
    }
    dispatch(resetBrowserPlayer());
    dispatch(resetAudioPlayer());
    dispatch(resetSpellReader());
  };

  return { playSpell, readSpell, mountSpell, togglePlayback, unloadSpell };
};
