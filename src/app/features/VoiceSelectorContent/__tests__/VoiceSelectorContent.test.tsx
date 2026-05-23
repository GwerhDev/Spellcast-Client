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

describe('VoiceSelectorContent', () => {
  it('renders voice selector tabs', () => {
    renderWithProviders(<VoiceSelectorContent onClose={() => {}} />);
    expect(screen.getAllByText(/browser/i).length).toBeGreaterThan(0);
  });
});
