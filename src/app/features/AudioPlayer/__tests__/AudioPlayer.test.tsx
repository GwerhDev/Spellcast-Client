import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { setSpellFile } from '../../../../store/spellReaderSlice';
import { AudioPlayer } from '../index';

vi.mock('../../../../db', () => ({
  getSpellById: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../../../db/audioCache', () => ({
  getCachedAudio: vi.fn().mockResolvedValue(null),
  setCachedAudio: vi.fn(),
}));

vi.mock('../../../../services/tts', () => ({
  textToSpeechService: vi.fn(),
}));

describe('AudioPlayer', () => {
  it('renders the audio player container', () => {
    renderWithProviders(
      <AudioPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />
    );
    expect(screen.getByTestId('audio-player')).toBeInTheDocument();
  });

  it('unloads the spell from its unload button', () => {
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(
      <AudioPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { store }
    );
    fireEvent.click(screen.getByTestId('unload-spell-button'));
    expect(store.getState().spellReader.spellId).toBeNull();
    expect(store.getState().spellReader.isLoaded).toBe(false);
  });
});
