import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { HomeStage, HOME_IDLE_MS } from '../index';
import { setSpellFile } from '../../../../store/spellReaderSlice';

// The scene and the list are their own features, tested on their own.
vi.mock('../../Start', () => ({ Start: ({ immersive }: { immersive?: boolean }) => <div data-testid="start-stub" data-immersive={String(!!immersive)} /> }));
vi.mock('../../LastSpells', () => ({ LastSpells: () => <div data-testid="last-spells-stub" /> }));

const mockCover = vi.fn();
vi.mock('../../../../hooks/useSpellCoverUrl', () => ({ useSpellCoverUrl: () => mockCover() }));

describe('HomeStage (feature)', () => {
  beforeEach(() => { mockCover.mockReset().mockReturnValue(null); });
  afterEach(() => { vi.useRealTimers(); });

  it('with nothing loaded: a plain page, the altar not immersive', () => {
    renderWithProviders(<HomeStage />);
    expect(screen.getByTestId('start-stub')).toHaveAttribute('data-immersive', 'false');
    expect(screen.queryByTestId('home-stage-cover')).not.toBeInTheDocument();
  });

  it("with a loaded spell's cover: the cover as backdrop, the altar immersive, Last Spells fading while the pointer rests", () => {
    vi.useFakeTimers();
    mockCover.mockReturnValue('blob:cover');
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<HomeStage />, { store });
    expect(screen.getByTestId('start-stub')).toHaveAttribute('data-immersive', 'true');
    expect(screen.getByTestId('home-stage-cover')).toBeInTheDocument();
    expect(screen.getByTestId('home-stage-secondary').className).not.toMatch(/secondaryHidden/);

    act(() => { vi.advanceTimersByTime(HOME_IDLE_MS); });
    expect(screen.getByTestId('home-stage-secondary').className).toMatch(/secondaryHidden/);

    act(() => { window.dispatchEvent(new MouseEvent('mousemove')); });
    expect(screen.getByTestId('home-stage-secondary').className).not.toMatch(/secondaryHidden/);
  });

  // Mounted, a spell always gets the immersive scene: only the backdrop depends on a cover.
  it('with a loaded spell without a cover: the altar immersive all the same, just no backdrop', () => {
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<HomeStage />, { store });
    expect(screen.getByTestId('start-stub')).toHaveAttribute('data-immersive', 'true');
    expect(screen.queryByTestId('home-stage-cover')).not.toBeInTheDocument();
  });
});
