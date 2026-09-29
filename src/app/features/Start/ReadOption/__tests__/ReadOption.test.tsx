import type React from 'react';
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
  // Covers are read through getSpellById here, so each test's own spell (and timing) applies.
  getSpellCover: (...args: unknown[]) => Promise.resolve(mockGetSpellById(...args)).then((d) => (d as { cover?: Blob } | null | undefined)?.cover ?? null),
  getCachedSpellCover: () => undefined,
}));

const mockImportFile = vi.fn();
vi.mock('../../../../../hooks/useSpellImport', () => ({
  useSpellImport: () => ({ importFile: (...args: unknown[]) => mockImportFile(...args), isImporting: false }),
}));

const spellFile = (name = 'book.spell') => new File(['x'], name);
// jsdom has no DragEvent/DataTransfer: a plain object with the drag's types and files.
const fileDrag = (files: File[]) => ({ dataTransfer: { types: ['Files'], files, dropEffect: 'none' } });

beforeEach(() => {
  mockGetSpellById.mockReset().mockResolvedValue(undefined);
  mockImportFile.mockReset().mockResolvedValue('imported-1');
  URL.createObjectURL = vi.fn(() => 'blob:cover');
  URL.revokeObjectURL = vi.fn();
});

// Every render gets the menu callbacks; tests that care pass their own.
const Read = (props: Partial<React.ComponentProps<typeof ReadOption>>) => (
  <ReadOption dragActive={false} onWrite={vi.fn()} onImport={vi.fn()} {...props} />
);

describe('ReadOption', () => {
  describe('the Spellcast button menu (nothing loaded)', () => {
    const menuHidden = () => screen.getByTestId('radial-menu').getAttribute('aria-hidden') === 'true';

    it('shows the Spellcast mark; a click opens the menu instead of playing', () => {
      const store = makeStore();
      renderWithProviders(<Read />, { store });
      expect(screen.getByTestId('read-option-brand-icon')).toBeInTheDocument();
      expect(menuHidden()).toBe(true);
      const button = screen.getByTestId('play-button');
      expect(button).toHaveAttribute('aria-haspopup', 'menu');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-controls', screen.getByTestId('radial-menu').id);
      fireEvent.click(button);
      expect(menuHidden()).toBe(false);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(store.getState().browserPlayer.toggleSeq).toBe(0);
      expect(store.getState().audioPlayer.toggleSeq).toBe(0);
    });

    it('a second click on the button closes it', () => {
      renderWithProviders(<Read />);
      fireEvent.click(screen.getByTestId('play-button'));
      fireEvent.mouseDown(screen.getByTestId('play-button'));
      fireEvent.click(screen.getByTestId('play-button'));
      expect(menuHidden()).toBe(true);
    });

    it('Write and Import open their modals through Start, and close the menu', () => {
      const onWrite = vi.fn();
      const onImport = vi.fn();
      renderWithProviders(<Read onWrite={onWrite} onImport={onImport} />);
      fireEvent.click(screen.getByTestId('play-button'));
      fireEvent.click(screen.getByTestId('radial-menu-item-write'));
      expect(onWrite).toHaveBeenCalled();
      expect(menuHidden()).toBe(true);
      fireEvent.click(screen.getByTestId('play-button'));
      fireEvent.click(screen.getByTestId('radial-menu-item-import'));
      expect(onImport).toHaveBeenCalled();
    });

    it('Editor navigates to the editor', () => {
      renderWithProviders(
        <Routes>
          <Route path="/" element={<Read />} />
          <Route path="/editor" element={<div data-testid="editor-route" />} />
        </Routes>,
      );
      fireEvent.click(screen.getByTestId('play-button'));
      fireEvent.click(screen.getByTestId('radial-menu-item-editor'));
      expect(screen.getByTestId('editor-route')).toBeInTheDocument();
    });

    it('closes when a spell is dragged over (the button turns back into play)', () => {
      const { rerender } = renderWithProviders(<Read />);
      fireEvent.click(screen.getByTestId('play-button'));
      expect(menuHidden()).toBe(false);
      rerender(<Read dragActive />);
      expect(menuHidden()).toBe(true);
    });
  });

  it('turns back into a play button while a spell is dragged over', () => {
    renderWithProviders(<Read dragActive />);
    expect(screen.getByTestId('read-option-hint')).toHaveTextContent('Drop it');
    expect(screen.queryByTestId('read-option-brand-icon')).not.toBeInTheDocument();
    expect(screen.getByTestId('play-button')).not.toHaveAttribute('title');
  });

  it('shows the loaded spell and toggles playback from the button', () => {
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<Read />, { store });
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
    renderWithProviders(<Read />, { store });
    const cover = await screen.findByTestId('read-option-cover');
    expect(cover.style.backgroundImage).toContain('blob:cover');
  });

  it('has no cover with nothing loaded, or when the spell has none', async () => {
    mockGetSpellById.mockResolvedValue({ id: 'spell-1', title: 'Spell one' });
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<Read />, { store });
    await waitFor(() => expect(mockGetSpellById).toHaveBeenCalled());
    expect(screen.queryByTestId('read-option-cover')).not.toBeInTheDocument();
  });

  it('shows the status line: playing vs paused', () => {
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<Read />, { store });
    expect(screen.getByTestId('read-option-now')).toHaveTextContent('Paused');
    act(() => { store.dispatch(play()); });
    expect(screen.getByTestId('read-option-now')).toHaveTextContent('Reading');
  });

  it('has a transparent panel (no box) while nothing is loaded', () => {
    renderWithProviders(<Read />);
    expect(screen.getByTestId('read-option').className).toMatch(/noCover/);
  });

  it('keeps the panel transparent for a loaded spell without a cover', async () => {
    mockGetSpellById.mockResolvedValue({ id: 'spell-1', title: 'Spell one' });
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<Read />, { store });
    await waitFor(() => expect(mockGetSpellById).toHaveBeenCalled());
    expect(screen.getByTestId('read-option').className).toMatch(/noCover/);
  });

  it('shows the panel once the loaded spell has a cover', async () => {
    mockGetSpellById.mockResolvedValue({ id: 'spell-1', title: 'Spell one', cover: new Blob(['x']) });
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<Read />, { store });
    await screen.findByTestId('read-option-cover');
    expect(screen.getByTestId('read-option').className).not.toMatch(/noCover/);
  });

  describe('open-in-reader shortcut', () => {
    it('is not shown with nothing loaded', () => {
      renderWithProviders(<Read />);
      expect(screen.queryByTestId('read-option-open-reader')).not.toBeInTheDocument();
    });

    it('is hidden while a spell is dragged over', () => {
      const store = makeStore();
      store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
      renderWithProviders(<Read dragActive />, { store });
      expect(screen.queryByTestId('read-option-open-reader')).not.toBeInTheDocument();
    });

    it("navigates to the loaded spell's reader", () => {
      const store = makeStore();
      store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
      renderWithProviders(
        <Routes>
          <Route path="/" element={<Read />} />
          <Route path="/spell/:id/reader" element={<div data-testid="reader-route" />} />
        </Routes>,
        { store },
      );
      fireEvent.click(screen.getByTestId('read-option-open-reader'));
      expect(screen.getByTestId('reader-route')).toBeInTheDocument();
    });
  });

  describe('dropping .spell files from the computer', () => {
    it('imports .spell files dropped on it (stored in the browser) and starts reading the first', async () => {
      mockGetSpellById.mockResolvedValue({ id: 'imported-1', title: 'Imported', createdAt: new Date(), userId: undefined });
      const store = makeStore();
      renderWithProviders(<Read />, { store });
      const option = screen.getByTestId('read-option');
      fireEvent.dragOver(option, fileDrag([spellFile()]));
      expect(option.className).toMatch(/dragActive/);
      await act(async () => { fireEvent.drop(option, fileDrag([spellFile('a.spell'), spellFile('b.spell')])); });
      await waitFor(() => expect(store.getState().spellReader.spellId).toBe('imported-1'));
      expect(mockImportFile).toHaveBeenCalledTimes(2);
      expect(option.className).not.toMatch(/dragActive/);
    });

    it('refuses anything that is not a .spell, with an error message', async () => {
      const store = makeStore();
      renderWithProviders(<Read />, { store });
      await act(async () => { fireEvent.drop(screen.getByTestId('read-option'), fileDrag([spellFile('book.pdf')])); });
      expect(mockImportFile).not.toHaveBeenCalled();
      const responses = store.getState().apiResponses.responses;
      expect(responses[responses.length - 1]).toMatchObject({ type: 'error' });
    });

    it('does not start reading when the import fails', async () => {
      mockImportFile.mockResolvedValue(null);
      const store = makeStore();
      renderWithProviders(<Read />, { store });
      await act(async () => { fireEvent.drop(screen.getByTestId('read-option'), fileDrag([spellFile()])); });
      await waitFor(() => expect(mockImportFile).toHaveBeenCalled());
      expect(mockGetSpellById).not.toHaveBeenCalledWith('imported-1', expect.anything());
      expect(store.getState().spellReader.spellId).toBeNull();
    });

    it('shows the importing state while a file is being imported', async () => {
      let finish: (id: string | null) => void = () => {};
      mockImportFile.mockReturnValue(new Promise(resolve => { finish = resolve; }));
      renderWithProviders(<Read />);
      fireEvent.drop(screen.getByTestId('read-option'), fileDrag([spellFile()]));
      await waitFor(() => expect(screen.getByTestId('read-option-hint')).toHaveTextContent('Importing spell'));
      await act(async () => { finish(null); });
      expect(screen.getByTestId('read-option-hint')).not.toHaveTextContent('Importing spell');
    });
  });

  describe('unload button', () => {
    it('is only shown with a spell loaded, not while dragging', () => {
      const { unmount } = renderWithProviders(<Read />);
      expect(screen.queryByTestId('read-option-unload')).not.toBeInTheDocument();
      unmount();

      const store = makeStore();
      store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
      const { unmount: unmount2 } = renderWithProviders(<Read />, { store });
      expect(screen.getByTestId('read-option-unload')).toBeInTheDocument();
      unmount2();

      renderWithProviders(<Read dragActive />, { store });
      expect(screen.queryByTestId('read-option-unload')).not.toBeInTheDocument();
    });

    it('takes the spell out of the player, back to the empty Read tab', () => {
      const store = makeStore();
      store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
      renderWithProviders(<Read />, { store });
      fireEvent.click(screen.getByTestId('read-option-unload'));
      expect(store.getState().spellReader.spellId).toBeNull();
      expect(screen.getByTestId('read-option-brand-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('read-option-unload')).not.toBeInTheDocument();
    });
  });
});
