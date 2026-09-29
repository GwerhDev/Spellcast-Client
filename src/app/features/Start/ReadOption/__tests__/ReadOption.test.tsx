import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../../test/renderWithProviders';
import { setSpellFile } from '../../../../../store/spellReaderSlice';
import { play } from '../../../../../store/browserPlayerSlice';
import { Routes, Route } from 'react-router-dom';
import { ReadOption } from '../index';

const mockGetSpellById = vi.fn();
vi.mock('../../../../../db', () => ({
  getSpellById: (...args: unknown[]) => mockGetSpellById(...args),
}));

beforeEach(() => {
  mockGetSpellById.mockReset().mockResolvedValue(undefined);
  URL.createObjectURL = vi.fn(() => 'blob:cover');
  URL.revokeObjectURL = vi.fn();
});

describe('ReadOption', () => {
  it('with nothing loaded, shows the Spellcast mark on an idle (not disabled) button that ignores clicks', () => {
    const store = makeStore();
    renderWithProviders(<ReadOption dragActive={false} />, { store });
    expect(screen.getByTestId('read-option-hint')).toHaveTextContent('Drag a spell');
    const button = screen.getByTestId('play-button');
    expect(screen.getByTestId('read-option-brand-icon')).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(button);
    expect(store.getState().browserPlayer.toggleSeq).toBe(0);
    expect(store.getState().audioPlayer.toggleSeq).toBe(0);
  });

  it('turns back into a play button while a spell is dragged over', () => {
    renderWithProviders(<ReadOption dragActive />);
    expect(screen.getByTestId('read-option-hint')).toHaveTextContent('Drop it');
    expect(screen.queryByTestId('read-option-brand-icon')).not.toBeInTheDocument();
    expect(screen.getByTestId('play-button')).not.toHaveAttribute('aria-disabled');
  });

  it('shows the loaded spell and toggles playback from the button', () => {
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<ReadOption dragActive={false} />, { store });
    expect(screen.getByTestId('read-option-title')).toHaveTextContent('Spell one');
    expect(screen.queryByTestId('read-option-hint')).not.toBeInTheDocument();
    expect(screen.queryByTestId('read-option-brand-icon')).not.toBeInTheDocument();
    const before = store.getState().browserPlayer.toggleSeq;
    fireEvent.click(screen.getByTestId('play-button'));
    expect(store.getState().browserPlayer.toggleSeq).toBe(before + 1);
  });

  it('fills the panel with the loaded spell cover, when it has one', async () => {
    mockGetSpellById.mockResolvedValue({ id: 'spell-1', title: 'Spell one', cover: new Blob(['x']) });
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<ReadOption dragActive={false} />, { store });
    const cover = await screen.findByTestId('read-option-cover');
    expect(cover.style.backgroundImage).toContain('blob:cover');
  });

  it('has no cover with nothing loaded, or when the spell has none', async () => {
    mockGetSpellById.mockResolvedValue({ id: 'spell-1', title: 'Spell one' });
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<ReadOption dragActive={false} />, { store });
    await waitFor(() => expect(mockGetSpellById).toHaveBeenCalled());
    expect(screen.queryByTestId('read-option-cover')).not.toBeInTheDocument();
  });

  it('shows the status line: playing vs paused', () => {
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<ReadOption dragActive={false} />, { store });
    expect(screen.getByTestId('read-option-now')).toHaveTextContent('Paused');
    act(() => { store.dispatch(play()); });
    expect(screen.getByTestId('read-option-now')).toHaveTextContent('Reading');
  });

  it('has a transparent panel (no box) while nothing is loaded', () => {
    renderWithProviders(<ReadOption dragActive={false} />);
    expect(screen.getByTestId('read-option').className).toMatch(/noCover/);
  });

  it('keeps the panel transparent for a loaded spell without a cover', async () => {
    mockGetSpellById.mockResolvedValue({ id: 'spell-1', title: 'Spell one' });
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<ReadOption dragActive={false} />, { store });
    await waitFor(() => expect(mockGetSpellById).toHaveBeenCalled());
    expect(screen.getByTestId('read-option').className).toMatch(/noCover/);
  });

  it('shows the panel once the loaded spell has a cover', async () => {
    mockGetSpellById.mockResolvedValue({ id: 'spell-1', title: 'Spell one', cover: new Blob(['x']) });
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<ReadOption dragActive={false} />, { store });
    await screen.findByTestId('read-option-cover');
    expect(screen.getByTestId('read-option').className).not.toMatch(/noCover/);
  });

  describe('open-in-reader shortcut', () => {
    it('is not shown with nothing loaded', () => {
      renderWithProviders(<ReadOption dragActive={false} />);
      expect(screen.queryByTestId('read-option-open-reader')).not.toBeInTheDocument();
    });

    it('is hidden while a spell is dragged over', () => {
      const store = makeStore();
      store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
      renderWithProviders(<ReadOption dragActive />, { store });
      expect(screen.queryByTestId('read-option-open-reader')).not.toBeInTheDocument();
    });

    it("navigates to the loaded spell's reader", () => {
      const store = makeStore();
      store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
      renderWithProviders(
        <Routes>
          <Route path="/" element={<ReadOption dragActive={false} />} />
          <Route path="/spell/:id/reader" element={<div data-testid="reader-route" />} />
        </Routes>,
        { store },
      );
      fireEvent.click(screen.getByTestId('read-option-open-reader'));
      expect(screen.getByTestId('reader-route')).toBeInTheDocument();
    });
  });
});
