import { describe, it, expect, vi, beforeAll } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { VoiceSelectorContent } from '../index';

vi.mock('../../../../db/preferences', () => ({
  saveVoicePreference: vi.fn(),
}));

beforeAll(() => {
  Object.defineProperty(window, 'speechSynthesis', {
    value: { pause: vi.fn(), resume: vi.fn(), cancel: vi.fn(), speak: vi.fn(), getVoices: vi.fn(() => []) },
    writable: true,
  });
});

const aiVoiceState = {
  voice: { selectedVoice: { value: 'default', type: 'ai' }, voices: [] },
};

const credential = (id: string, voiceName: string) => ({
  id,
  region: 'eastus',
  voices: [{ value: `${voiceName}-value`, name: voiceName, gender: 'Female' }],
});

describe('VoiceSelectorContent', () => {
  it('renders voice selector tabs', () => {
    renderWithProviders(<VoiceSelectorContent onClose={() => {}} />);
    expect(screen.getAllByText(/browser/i).length).toBeGreaterThan(0);
  });

  it('lists AI voices from the active credential', () => {
    renderWithProviders(<VoiceSelectorContent onClose={() => {}} />, {
      preloadedState: {
        ...aiVoiceState,
        credentials: {
          credentials: [credential('cred-1', 'Adri'), credential('cred-2', 'Willem')],
          currentCredentialId: 'cred-2',
          loading: false,
          error: null,
        },
      },
    });
    expect(screen.getByText('Willem')).toBeInTheDocument();
    expect(screen.queryByText('Adri')).not.toBeInTheDocument();
  });

  it('falls back to the first credential when none is marked active', () => {
    renderWithProviders(<VoiceSelectorContent onClose={() => {}} />, {
      preloadedState: {
        ...aiVoiceState,
        credentials: {
          credentials: [credential('cred-1', 'Adri'), credential('cred-2', 'Willem')],
          currentCredentialId: null,
          loading: false,
          error: null,
        },
      },
    });
    expect(screen.getByText('Adri')).toBeInTheDocument();
  });
});
