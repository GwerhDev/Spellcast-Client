import { describe, it, expect, vi, beforeAll } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { setSpellFile } from '../../../../store/spellReaderSlice';
import { BrowserPlayer } from '../index';

vi.mock('../../../../db', () => ({
  getSpellById: vi.fn().mockResolvedValue(null),
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

  it('unloads the spell from its unload button', () => {
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(
      <BrowserPlayer showVoiceSelectorModal={vi.fn()} showPlayerConfigModal={vi.fn()} />,
      { store }
    );
    fireEvent.click(screen.getByTestId('unload-spell-button'));
    expect(store.getState().spellReader.spellId).toBeNull();
    expect(store.getState().spellReader.isLoaded).toBe(false);
  });
});
