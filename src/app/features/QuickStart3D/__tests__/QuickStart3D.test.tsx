import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { QuickStart3DStrip, QuickStart3DScene, useQuickStart3D } from '../index';
import * as db from '../../../../db';
import type { ScenePlace } from '../../../components/Home3D/HomeScene3D';

// WebGL isn't available here: the scene stands in as a marker showing the row it's given --
// what's in each place, and what's in the middle one.
vi.mock('../../../components/Cover3D/lazyCover3D', () => ({
  LazyHomeScene3D: ({ places, onMore }: { places: ScenePlace[]; onMore: () => void }) => (
    <div
      data-testid="scene-stub"
      data-row={places.map(p => (p.kind === 'book' ? p.book!.id : p.kind)).join(',')}
      data-center={places.find(p => p.look.x === 0)?.book?.id ?? ''}
    >
      <button data-testid="scene-more" onClick={onMore} />
    </div>
  ),
}));

const spell = (n: number) => ({ id: `spell-${n}`, title: `Spell ${n}`, userId: 'user-1', createdAt: new Date(2026, 0, n).toISOString() });

const Harness = () => {
  const model = useQuickStart3D();
  return (
    <>
      <QuickStart3DStrip model={model} />
      <QuickStart3DScene model={model} />
    </>
  );
};

const loggedStore = () => {
  const store = makeStore();
  store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { id: 'user-1', loader: false } } });
  return store;
};

describe('QuickStart3D', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // The same row as the page's coverflow: a spell in the middle and three on each side,
  // wrapping around, with empty places where there are fewer spells.
  it('gives the scene the same row as the page: newest in the middle, wrapping around, empty places filling it', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([spell(1), spell(3), spell(2)] as never);
    renderWithProviders(<Harness />, { store: loggedStore() });
    await waitFor(() => expect(screen.getByTestId('scene-stub')).toHaveAttribute('data-center', 'spell-3'));
    expect(screen.getByTestId('scene-stub').getAttribute('data-row')).toBe('empty,empty,empty,spell-3,spell-2,spell-1,empty');
  });

  it('the arrows turn the row, round and round', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([spell(1), spell(2)] as never);
    renderWithProviders(<Harness />, { store: loggedStore() });
    await waitFor(() => expect(screen.getByTestId('scene-stub')).toHaveAttribute('data-center', 'spell-2'));
    fireEvent.click(screen.getByTestId('quick-start-3d-next'));
    expect(screen.getByTestId('scene-stub')).toHaveAttribute('data-center', 'spell-1');
    fireEvent.click(screen.getByTestId('quick-start-3d-next'));
    expect(screen.getByTestId('scene-stub')).toHaveAttribute('data-center', 'spell-2');
    fireEvent.click(screen.getByTestId('quick-start-3d-prev'));
    expect(screen.getByTestId('scene-stub')).toHaveAttribute('data-center', 'spell-1');
  });

  // The scene draws the books; each one is also a button for the keyboard and screen readers.
  it("each spell is a button: focused, it's brought to the middle; pressed, its detail opens", async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([spell(1), spell(2)] as never);
    vi.spyOn(db, 'getSpellById').mockReturnValue(new Promise(() => {}) as never);
    renderWithProviders(<Harness />, { store: loggedStore() });
    const button = await screen.findByTestId('quick-start-3d-book-spell-1');
    fireEvent.focus(button);
    expect(screen.getByTestId('scene-stub')).toHaveAttribute('data-center', 'spell-1');
    fireEvent.click(button);
    expect(await screen.findByTestId('spell-detail-modal-loading')).toBeInTheDocument();
  });

  it('past the spells it shows, a card leads to the rest of them', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue(Array.from({ length: 12 }, (_, i) => spell(i + 1)) as never);
    renderWithProviders(<Harness />, { store: loggedStore() });
    await waitFor(() => expect(screen.getByTestId('scene-stub').getAttribute('data-row')).toContain('more'));
    expect(screen.getByTestId('quick-start-3d-see-all')).toBeInTheDocument();
  });

  it('shows nothing with no spells at all', async () => {
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([] as never);
    renderWithProviders(<Harness />, { store: loggedStore() });
    await waitFor(() => expect(screen.queryByTestId('quick-start-3d')).not.toBeInTheDocument());
    expect(screen.queryByTestId('scene-stub')).not.toBeInTheDocument();
  });
});
