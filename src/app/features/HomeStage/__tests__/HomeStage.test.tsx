import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act, fireEvent } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { HomeStage, HOME_IDLE_MS } from '../index';
import { setSpellFile } from '../../../../store/spellReaderSlice';
import { setAltarBackdrop } from '../../../../store/altarSlice';

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

  it("with a loaded spell's cover and the altar set to show it: the cover as backdrop, the altar immersive, Last Spells fading while the pointer rests", () => {
    vi.useFakeTimers();
    mockCover.mockReturnValue('blob:cover');
    const store = makeStore();
    store.dispatch(setAltarBackdrop('cover'));
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

  // By default the altar draws nothing behind it, cover or not.
  it("with a loaded spell's cover and the altar's default: no backdrop", () => {
    mockCover.mockReturnValue('blob:cover');
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<HomeStage />, { store });
    expect(store.getState().altar.backdrop).toBe('none');
    expect(screen.queryByTestId('home-stage-cover')).not.toBeInTheDocument();
  });

  it("the altar's settings pick the backdrop, applied at once", () => {
    mockCover.mockReturnValue('blob:cover');
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<HomeStage />, { store });
    fireEvent.click(screen.getByTestId('altar-settings-btn'));
    expect(screen.getByTestId('altar-backdrop-none')).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByTestId('altar-backdrop-cover'));
    expect(store.getState().altar.backdrop).toBe('cover');
    expect(screen.getByTestId('altar-backdrop-cover')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('home-stage-cover')).toBeInTheDocument();

    // And the quick start under the altar: filters that combine -- the latest by default,
    // in progress added on top of it, favorites not there yet.
    expect(screen.getByTestId('altar-quick-start-last')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('altar-quick-start-favorites')).toBeDisabled();
    fireEvent.click(screen.getByTestId('altar-quick-start-inProgress'));
    expect(store.getState().altar.quickStart).toEqual(['last', 'inProgress']);
    expect(screen.getByTestId('altar-quick-start-last')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('altar-quick-start-inProgress')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByTestId('altar-quick-start-last'));
    expect(store.getState().altar.quickStart).toEqual(['inProgress']);
  });

  it("the altar's functions tab turns reading on conjuring off and on", () => {
    const store = makeStore();
    renderWithProviders(<HomeStage />, { store });
    fireEvent.click(screen.getByTestId('altar-settings-btn'));
    fireEvent.click(screen.getByTitle('Functions'));
    const toggle = screen.getByTestId('altar-settings-functions').querySelector('[role="switch"]')!;
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(store.getState().altar.readOnConjure).toBe(false);
  });
});
