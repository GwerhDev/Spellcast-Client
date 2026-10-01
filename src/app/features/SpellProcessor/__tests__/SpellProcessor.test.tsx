import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { setSpellFile, resetSpellReader } from '../../../../store/spellReaderSlice';
import { SpellProcessor } from '../index';

const mockGetSpellById = vi.fn();
vi.mock('../../../../db', () => ({
  getSpellById: (...args: unknown[]) => mockGetSpellById(...args),
  // Covers are read through getSpellById here, so each test's own spell (and timing) applies.
  getSpellCover: (...args: unknown[]) => Promise.resolve(mockGetSpellById(...args)).then((d) => (d as { cover?: Blob } | null | undefined)?.cover ?? null),
  getCachedSpellCover: () => undefined,
  updateSpellProgress: vi.fn(),
}));

vi.mock('../../../../utils/pdfUtils', () => ({
  injectCoverIntoPages: vi.fn(async (pages) => pages),
}));

const page = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
const spell = (id: string, text: string) => ({ id, title: id, pagesContent: JSON.stringify([page(text), page(`${text} two.`)]) });

beforeEach(() => {
  mockGetSpellById.mockReset().mockImplementation(async (id: string) => spell(id, `${id} one.`));
});

describe('SpellProcessor', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<SpellProcessor />);
    expect(container).toBeInTheDocument();
  });

  it('marks the spell loaded once its pages are read', async () => {
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'a', title: 'a' }));
    renderWithProviders(<SpellProcessor />, { store });
    await waitFor(() => expect(store.getState().spellReader.isLoaded).toBe(true));
    expect(store.getState().spellReader.sentences).toEqual(['a one.']);
  });

  // The persistent player is shown while isLoaded; republishing the previous spell's page
  // after an unload kept an empty player on screen.
  it('stays unloaded after the spell is unloaded', async () => {
    const store = makeStore();
    // Resumed on page 2, so the unload's reset back to page 1 is a page change too.
    store.dispatch(setSpellFile({ id: 'a', title: 'a', progress: { currentPage: 2, pagesProgress: [], lastReadSentenceIndex: 0 } }));
    renderWithProviders(<SpellProcessor />, { store });
    await waitFor(() => expect(store.getState().spellReader.isLoaded).toBe(true));
    act(() => { store.dispatch(resetSpellReader()); });
    await act(async () => { await Promise.resolve(); });
    expect(store.getState().spellReader.isLoaded).toBe(false);
    expect(store.getState().spellReader.sentences).toEqual([]);
  });

  it('ignores a read that finishes after its spell was already swapped for another', async () => {
    let finishA: (value: unknown) => void = () => {};
    mockGetSpellById.mockImplementation((id: string) =>
      id === 'a' ? new Promise(resolve => { finishA = resolve; }) : Promise.resolve(spell('b', 'b one.')));
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'a', title: 'a' }));
    renderWithProviders(<SpellProcessor />, { store });
    act(() => { store.dispatch(setSpellFile({ id: 'b', title: 'b' })); });
    await waitFor(() => expect(store.getState().spellReader.sentences).toEqual(['b one.']));
    await act(async () => { finishA(spell('a', 'a one.')); });
    expect(store.getState().spellReader.sentences).toEqual(['b one.']);
  });

  // Switching spells used to publish the PREVIOUS spell's page under the new spellId for one
  // render (its pages were still in state), marking it loaded -- so the new player autoplayed
  // the old text, then restarted once the new spell's pages arrived.
  it("never publishes the previous spell's page as the new spell's, while the new one loads", async () => {
    let finishB: (value: unknown) => void = () => {};
    mockGetSpellById.mockImplementation((id: string) =>
      id === 'b' ? new Promise(resolve => { finishB = resolve; }) : Promise.resolve(spell('a', 'a one.')));
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'a', title: 'a' }));
    renderWithProviders(<SpellProcessor />, { store });
    await waitFor(() => expect(store.getState().spellReader.sentences).toEqual(['a one.']));

    const published: string[][] = [];
    const loadedFlags: boolean[] = [];
    store.subscribe(() => {
      const r = store.getState().spellReader;
      published.push(r.sentences);
      loadedFlags.push(r.isLoaded);
    });
    // What playSpell does on a spell change: reset, then the new spell, in one batch.
    act(() => {
      store.dispatch(resetSpellReader());
      store.dispatch(setSpellFile({ id: 'b', title: 'b' }));
    });
    await act(async () => { await Promise.resolve(); });
    expect(published.some(sentences => sentences.includes('a one.'))).toBe(false);
    expect(store.getState().spellReader.isLoaded).toBe(false);

    await act(async () => { finishB(spell('b', 'b one.')); });
    await waitFor(() => expect(store.getState().spellReader.sentences).toEqual(['b one.']));
    expect(store.getState().spellReader.isLoaded).toBe(true);
  });

  // A page's columns (see ColumnsExtension) are read in order: the first column, then the next.
  it('reads the sentences inside a page\'s columns, column by column', async () => {
    const para = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
    const columnsPage = {
      type: 'doc',
      content: [
        para('Before.'),
        { type: 'columns', content: [
          { type: 'column', content: [para('Left one.'), para('Left two.')] },
          { type: 'column', content: [para('Right one.')] },
        ] },
        para('After.'),
      ],
    };
    mockGetSpellById.mockImplementation(async (id: string) => ({ id, title: id, pagesContent: JSON.stringify([columnsPage]) }));
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'cols', title: 'cols' }));
    renderWithProviders(<SpellProcessor />, { store });
    await waitFor(() => expect(store.getState().spellReader.isLoaded).toBe(true));
    expect(store.getState().spellReader.sentences).toEqual(['Before.', 'Left one.', 'Left two.', 'Right one.', 'After.']);
  });
});

