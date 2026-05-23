import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { VoiceSelectorContent } from '../index';

vi.mock('../../../../db/preferences', () => ({
  saveVoicePreference: vi.fn(),
}));

describe('VoiceSelectorContent', () => {
  it('renders voice selector tabs', () => {
    renderWithProviders(<VoiceSelectorContent onClose={() => {}} />);
    expect(screen.getByText(/browser/i)).toBeInTheDocument();
  });
});
