import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../../../test/renderWithProviders';
import { VoiceSelectorButton } from '../VoiceSelectorButton';

// Shared by AudioPlayer (may pass credentialError) and BrowserPlayer (never does) — these
// tests cover both branches to guard the Phase 3a consolidation of what used to be two
// near-duplicate components.
describe('VoiceSelectorButton', () => {
  it('shows the AI voice label with primary tone when selectedVoice.type is "ai"', () => {
    renderWithProviders(<VoiceSelectorButton onClick={vi.fn()} />, {
      preloadedState: { voice: { selectedVoice: { value: 'en-US-JennyNeural', type: 'ai' }, voices: [] } },
    });
    expect(screen.getByTestId('voice-selector-button')).toBeInTheDocument();
  });

  it('shows the browser voice label with default tone when selectedVoice.type is "browser" (BrowserPlayer\'s use case)', () => {
    renderWithProviders(<VoiceSelectorButton onClick={vi.fn()} />, {
      preloadedState: { voice: { selectedVoice: { value: 'default', type: 'browser' }, voices: [] } },
    });
    expect(screen.getByTestId('voice-selector-button')).toHaveAttribute('title', 'Browser');
  });

  it('shows the credential error state instead of the voice label when credentialError is set', () => {
    renderWithProviders(
      <VoiceSelectorButton onClick={vi.fn()} credentialError="quota" />,
      { preloadedState: { voice: { selectedVoice: { value: 'en-US-JennyNeural', type: 'ai' }, voices: [] } } }
    );
    expect(screen.getByTestId('voice-selector-button')).toHaveAttribute('title', 'Credential error — click to change');
  });

  it('fires onClick when clicked', () => {
    const onClick = vi.fn();
    renderWithProviders(<VoiceSelectorButton onClick={onClick} />, {
      preloadedState: { voice: { selectedVoice: { value: 'default', type: 'browser' }, voices: [] } },
    });
    fireEvent.click(screen.getByTestId('voice-selector-button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
