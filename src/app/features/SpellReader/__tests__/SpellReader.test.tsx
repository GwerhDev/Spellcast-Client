import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { SpellReader } from '../index';
import { setSpellFile, setSpellLoaded } from '../../../../store/spellReaderSlice';

// MagicTextEditor / TTSSpellReader use browser APIs not available in jsdom
vi.mock('../../../../magictext', () => ({
  MagicTextEditor: () => null,
  TTSSpellReader: () => null,
}));

vi.mock('../../../components/Modals/SpellDetailModal', () => ({
  SpellDetailModal: ({ show, spellId }: { show: boolean; spellId: string | null }) =>
    show ? <div data-testid="mock-spell-detail-modal">{spellId}</div> : null,
}));

describe('SpellReader', () => {
  it('renders the reader container', () => {
    renderWithProviders(<SpellReader />);
    expect(screen.getByTestId('spell-reader')).toBeInTheDocument();
  });

  it('shows loading state when document is not loaded', () => {
    renderWithProviders(<SpellReader />);
    // Default spellReader state has isLoaded = false
    expect(screen.getByTestId('spell-reader-loading')).toBeInTheDocument();
  });

  it('opens the spell detail modal with the current spell when the info button is clicked', () => {
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'doc-1', title: 'Test Spell' }));
    store.dispatch(setSpellLoaded(true));
    renderWithProviders(<SpellReader />, { store });

    expect(screen.queryByTestId('mock-spell-detail-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('spell-reader-info-btn'));
    expect(screen.getByTestId('mock-spell-detail-modal')).toHaveTextContent('doc-1');
  });
});
