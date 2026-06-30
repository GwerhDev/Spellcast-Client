import { describe, it, expect, vi } from 'vitest';
import reducer, { setSelectedVoice, setVoices, loadVoicePreference } from '../voiceSlice';

vi.mock('../../db/preferences', () => ({
  getVoicePreference: vi.fn(),
}));

const initial = {
  selectedVoice: { value: 'default', type: 'browser' as const },
  voices: [{ name: 'Browser', value: 'browser', gender: 'Male' }],
};

describe('voiceSlice', () => {
  it('returns initial state', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.selectedVoice).toEqual({ value: 'default', type: 'browser' });
    expect(state.voices).toHaveLength(1);
  });

  it('setSelectedVoice updates the selected voice', () => {
    const voice = { value: 'en-US', type: 'ai' as const };
    const state = reducer(initial, setSelectedVoice(voice));
    expect(state.selectedVoice).toEqual(voice);
  });

  it('setVoices replaces the voices list', () => {
    const voices = [
      { name: 'English', value: 'en-US', gender: 'Female' },
      { name: 'Spanish', value: 'es-ES', gender: 'Male' },
    ];
    const state = reducer(initial, setVoices(voices));
    expect(state.voices).toEqual(voices);
  });

  it('loadVoicePreference.fulfilled updates selectedVoice when payload is defined', () => {
    const stored = { value: 'es-ES', type: 'ai' as const };
    const action = loadVoicePreference.fulfilled(stored, '', 'user-1');
    const state = reducer(initial, action);
    expect(state.selectedVoice).toEqual(stored);
  });

  it('loadVoicePreference.fulfilled is no-op when payload is null', () => {
    const action = loadVoicePreference.fulfilled(null, '', 'user-1');
    const state = reducer(initial, action);
    expect(state.selectedVoice).toEqual(initial.selectedVoice);
  });
});
