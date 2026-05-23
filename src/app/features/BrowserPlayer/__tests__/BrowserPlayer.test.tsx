import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { BrowserPlayer } from '../index';

vi.mock('../../../../db', () => ({
  getDocumentById: vi.fn().mockResolvedValue(null),
}));

describe('BrowserPlayer', () => {
  it('renders the browser player container', () => {
    renderWithProviders(
      <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />
    );
    expect(screen.getByTestId('browser-player')).toBeInTheDocument();
  });
});
