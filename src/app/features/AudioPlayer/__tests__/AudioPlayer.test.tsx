import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { AudioPlayer } from '../index';

vi.mock('../../../../db', () => ({
  getDocumentById: vi.fn().mockResolvedValue(null),
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
});
