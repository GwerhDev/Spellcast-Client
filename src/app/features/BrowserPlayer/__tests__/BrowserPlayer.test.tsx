import { describe, it, expect, vi, beforeAll } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { BrowserPlayer } from '../index';

vi.mock('../../../../db', () => ({
  getDocumentById: vi.fn().mockResolvedValue(null),
}));

beforeAll(() => {
  Object.defineProperty(window, 'speechSynthesis', {
    value: { pause: vi.fn(), resume: vi.fn(), cancel: vi.fn(), speak: vi.fn(), getVoices: vi.fn(() => []), addEventListener: vi.fn(), removeEventListener: vi.fn() },
    writable: true,
  });
});

describe('BrowserPlayer', () => {
  it('renders the browser player container', () => {
    renderWithProviders(
      <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />
    );
    expect(screen.getByTestId('browser-player')).toBeInTheDocument();
  });
});
