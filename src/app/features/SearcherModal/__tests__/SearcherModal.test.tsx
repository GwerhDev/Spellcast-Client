import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { SearcherModal } from '../index';
import { setSpellFile, setSpellLoaded, setSpellInfo, setShowSearcher } from '../../../../store/spellReaderSlice';

const { page1, page2 } = vi.hoisted(() => ({
  page1: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'The dragon slept in the cave.' }] }] },
  page2: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A knight arrived at dawn.' }] }] },
}));

vi.mock('../../../../db', () => ({
  getSpellById: vi.fn().mockResolvedValue({
    id: 'doc-1',
    pagesContent: JSON.stringify([page1, page2]),
  }),
}));

const renderOpen = () => {
  const store = makeStore();
  store.dispatch(setSpellFile({ id: 'doc-1', title: 'Test Spell' }));
  store.dispatch(setSpellInfo({ totalPages: 2 }));
  store.dispatch(setSpellLoaded(true));
  store.dispatch(setShowSearcher(true));
  return renderWithProviders(<SearcherModal />, { store });
};

describe('SearcherModal', () => {
  it('renders nothing when showSearcher is false', () => {
    const { container } = renderWithProviders(<SearcherModal />);
    expect(container.firstChild).toBeNull();
  });

  it('shows every page in a single list with no page/text mode toggle', async () => {
    renderOpen();
    await screen.findByTestId('searcher-page-1');
    expect(screen.getByTestId('searcher-page-2')).toBeInTheDocument();
    expect(screen.queryByTestId('searcher-tab-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('searcher-tab-text')).not.toBeInTheDocument();
  });

  it('offers to jump to a page when the query is a valid page number', async () => {
    renderOpen();
    await screen.findByTestId('searcher-page-1');
    fireEvent.change(screen.getByTestId('searcher-input'), { target: { value: '2' } });
    expect(screen.getByTestId('searcher-jump-btn')).toBeInTheDocument();
  });

  it('shows matching text snippets from anywhere in the spell for a text query', async () => {
    renderOpen();
    await screen.findByTestId('searcher-page-1');
    fireEvent.change(screen.getByTestId('searcher-input'), { target: { value: 'dawn' } });
    await waitFor(() => expect(screen.getAllByTestId('searcher-match')).toHaveLength(1));
  });

  it('shows a no-results message when nothing matches', async () => {
    renderOpen();
    await screen.findByTestId('searcher-page-1');
    fireEvent.change(screen.getByTestId('searcher-input'), { target: { value: 'nonexistentword' } });
    expect(await screen.findByTestId('searcher-no-results')).toBeInTheDocument();
  });
});
