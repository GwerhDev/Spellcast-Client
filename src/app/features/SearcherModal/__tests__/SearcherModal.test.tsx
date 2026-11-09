import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { SearcherModal } from '../index';
import { setSpellFile, setSpellLoaded, setSpellInfo, setShowSearcher } from '../../../../store/spellReaderSlice';

const { page1, page2 } = vi.hoisted(() => ({
  page1: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'The dragon slept in the cave.' }] }] },
  page2: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A knight arrived at dawn.' }] }] },
}));

vi.mock('../../../../db', () => ({
  // The open Spell's cover, for its tab.
  getCachedSpellCover: () => new Blob(['cover'], { type: 'image/png' }),
  getSpellCover: vi.fn().mockResolvedValue(null),
  getSpellById: vi.fn().mockResolvedValue({
    id: 'doc-1',
    pagesContent: JSON.stringify([page1, page2]),
  }),
  getSpellsFromDB: vi.fn().mockResolvedValue([
    { id: 'sp-1', title: 'Cuentos inconclusos', author: 'Tolkien', listedPages: { present: true, count: 755, bytes: 1 } },
    { id: 'sp-2', title: 'The Hobbit', tags: ['dragons'] },
  ]),
}));

const Where = () => <p data-testid="location">{useLocation().pathname}</p>;

const renderOpen = ({ withSpell = true, route = '/', onOpenPlayerSettings = () => {} }: { withSpell?: boolean; route?: string; onOpenPlayerSettings?: () => void } = {}) => {
  const store = makeStore();
  if (withSpell) {
    store.dispatch(setSpellFile({ id: 'doc-1', title: 'Test Spell' }));
    store.dispatch(setSpellInfo({ totalPages: 2 }));
    store.dispatch(setSpellLoaded(true));
  }
  store.dispatch(setShowSearcher(true));
  window.history.pushState({}, '', route);
  return renderWithProviders(
    <Routes><Route path="*" element={<><SearcherModal onOpenPlayerSettings={onOpenPlayerSettings} /><Where /></>} /></Routes>,
    { store },
  );
};

describe('SearcherModal', () => {
  it('renders nothing when showSearcher is false', () => {
    renderWithProviders(<SearcherModal />);
    expect(screen.queryByTestId('tab-search')).not.toBeInTheDocument();
  });

  describe('everything at once', () => {
    it('lists nothing until something is looked for: it says what it can find', async () => {
      renderOpen();
      expect(screen.getByTestId('general-search-hint')).toHaveTextContent('Test Spell');
      expect(screen.getByTestId('general-search-hint').querySelector('svg')).toHaveAttribute('data-icon', 'magnifying-glass');
      // The grimoire's tab has the grimoire's icon, as in the sidebar.
      expect(screen.getByTestId('tab-grimoire').querySelector('svg')).toHaveAttribute('data-icon', 'building-columns');
      expect(screen.queryByTestId('general-search-spells')).not.toBeInTheDocument();
      renderOpen({ withSpell: false });
      expect(screen.getAllByTestId('general-search-hint')[1]).toHaveTextContent(/Open a Spell/);
    });

    it("finds Spells, the open Spell's text and the settings, by kind", async () => {
      renderOpen();
      await waitFor(() => expect(screen.getByTestId('general-search-hint')).toBeInTheDocument());
      fireEvent.change(screen.getByTestId('general-search-input'), { target: { value: 'dragon' } });
      expect(await screen.findByTestId('general-search-spell-sp-2')).toBeInTheDocument();
      expect(await screen.findByTestId('general-search-match')).toHaveTextContent('The dragon slept');
      fireEvent.change(screen.getByTestId('general-search-input'), { target: { value: 'theme' } });
      expect(screen.getByTestId('general-search-setting-appearance')).toBeInTheDocument();
      fireEvent.change(screen.getByTestId('general-search-input'), { target: { value: 'zzzz' } });
      expect(screen.getByTestId('general-search-no-results')).toBeInTheDocument();
    });

    it("goes to a page of the open Spell by its number", async () => {
      const { store } = renderOpen();
      fireEvent.change(screen.getByTestId('general-search-input'), { target: { value: '2' } });
      fireEvent.click(screen.getByTestId('general-search-jump'));
      expect(store.getState().spellReader.currentPage).toBe(2);
      expect(screen.getByTestId('location')).toHaveTextContent('/spell/doc-1/reader');
    });

    it('offers no page to go to with no Spell open', () => {
      renderOpen({ withSpell: false });
      fireEvent.change(screen.getByTestId('general-search-input'), { target: { value: '1' } });
      expect(screen.queryByTestId('general-search-jump')).not.toBeInTheDocument();
    });
  });

  describe("the open Spell's tab: its pages and text", () => {
    it('is there only with a Spell open, its cover as its icon', () => {
      renderOpen();
      expect(screen.getByTestId('tab-spell')).toContainElement(screen.getByTestId('current-spell-tab-cover'));
    });

    it("isn't there with no Spell open", () => {
      renderOpen({ withSpell: false });
      expect(screen.queryByTestId('tab-spell')).not.toBeInTheDocument();
    });

    it('shows every page in a single list', async () => {
      renderOpen();
      fireEvent.click(screen.getByTestId('tab-spell'));
      await screen.findByTestId('searcher-page-1');
      expect(screen.getByTestId('searcher-page-2')).toBeInTheDocument();
    });

    it('offers to jump to a page when the query is a valid page number', async () => {
      renderOpen();
      fireEvent.click(screen.getByTestId('tab-spell'));
      await screen.findByTestId('searcher-page-1');
      fireEvent.change(screen.getByTestId('searcher-input'), { target: { value: '2' } });
      expect(screen.getByTestId('searcher-jump-btn')).toBeInTheDocument();
    });

    it('shows matching text snippets from anywhere in the spell for a text query', async () => {
      renderOpen();
      fireEvent.click(screen.getByTestId('tab-spell'));
      await screen.findByTestId('searcher-page-1');
      fireEvent.change(screen.getByTestId('searcher-input'), { target: { value: 'dawn' } });
      await waitFor(() => expect(screen.getAllByTestId('searcher-match')).toHaveLength(1));
    });

    it('shows a no-results message when nothing matches', async () => {
      renderOpen();
      fireEvent.click(screen.getByTestId('tab-spell'));
      await screen.findByTestId('searcher-page-1');
      fireEvent.change(screen.getByTestId('searcher-input'), { target: { value: 'nonexistentword' } });
      expect(await screen.findByTestId('searcher-no-results')).toBeInTheDocument();
    });
  });

  describe("the grimoire's tab: its Spells", () => {
    it('finds them by title, author or tag, and opens the one chosen', async () => {
      const { store } = renderOpen({ withSpell: false });
      fireEvent.click(screen.getByTestId('tab-grimoire'));
      await screen.findByTestId('spells-search-sp-1');
      expect(screen.getByTestId('spells-search-sp-1')).toHaveTextContent('Tolkien');
      fireEvent.change(screen.getByTestId('spells-search-input'), { target: { value: 'dragons' } });
      expect(screen.queryByTestId('spells-search-sp-1')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('spells-search-sp-2'));
      expect(screen.getByTestId('location')).toHaveTextContent('/spell/sp-2');
      expect(store.getState().spellReader.showSearcher).toBe(false);
    });

    it("says when none matches", async () => {
      renderOpen({ withSpell: false });
      fireEvent.click(screen.getByTestId('tab-grimoire'));
      await screen.findByTestId('spells-search-sp-1');
      fireEvent.change(screen.getByTestId('spells-search-input'), { target: { value: 'silmarillion' } });
      expect(screen.getByTestId('spells-search-no-results').querySelector('svg')).toHaveAttribute('data-icon', 'building-columns');
    });
  });

  describe('the settings', () => {
    it('finds one by its keywords and opens its page', async () => {
      renderOpen({ withSpell: false });
      fireEvent.click(screen.getByTestId('tab-settings'));
      fireEvent.change(screen.getByTestId('settings-search-input'), { target: { value: 'theme' } });
      expect(screen.getAllByTestId(/^settings-search-(?!input|no-results)/).map(el => el.dataset.testid)).toEqual(['settings-search-appearance']);
      fireEvent.click(screen.getByTestId('settings-search-appearance'));
      expect(screen.getByTestId('location')).toHaveTextContent('/caster/settings/appearance');
    });

    it("opens a panel: the player's, and the reader's only with a Spell open", async () => {
      const onOpenPlayerSettings = vi.fn();
      const { store } = renderOpen({ withSpell: false, onOpenPlayerSettings });
      fireEvent.click(screen.getByTestId('tab-settings'));
      expect(screen.queryByTestId('settings-search-readerSettings')).not.toBeInTheDocument();
      expect(screen.queryByTestId('settings-search-editorSettings')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('settings-search-playerSettings'));
      expect(onOpenPlayerSettings).toHaveBeenCalledTimes(1);
      expect(store.getState().spellReader.showSearcher).toBe(false);
    });

    it("opens the reader's settings with a Spell open", async () => {
      const { store } = renderOpen();
      fireEvent.click(screen.getByTestId('tab-settings'));
      fireEvent.click(screen.getByTestId('settings-search-readerSettings'));
      expect(store.getState().spellReader.showReaderSettings).toBe(true);
    });
  });
});
