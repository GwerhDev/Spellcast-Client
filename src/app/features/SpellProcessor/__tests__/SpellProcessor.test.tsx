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
});
