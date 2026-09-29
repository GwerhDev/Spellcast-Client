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

describe('ReadOption', () => {
  it('with nothing loaded, the Spellcast-mark button opens the .spell picker (said only in its title)', () => {
    const store = makeStore();
    renderWithProviders(<ReadOption dragActive={false} />, { store });
    expect(screen.getByTestId('read-option-hint')).toHaveTextContent('Drag a spell');
    expect(screen.getByTestId('read-option-hint')).not.toHaveTextContent('.spell');
    const button = screen.getByTestId('play-button');
    expect(screen.getByTestId('read-option-brand-icon')).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Open a .spell file');
    const pick = vi.spyOn(screen.getByTestId('read-option-file-input'), 'click');
    fireEvent.click(button);
    expect(pick).toHaveBeenCalled();
    expect(store.getState().browserPlayer.toggleSeq).toBe(0);
    expect(store.getState().audioPlayer.toggleSeq).toBe(0);
  });

  it('turns back into a play button while a spell is dragged over', () => {
    renderWithProviders(<ReadOption dragActive />);
    expect(screen.getByTestId('read-option-hint')).toHaveTextContent('Drop it');
    expect(screen.queryByTestId('read-option-brand-icon')).not.toBeInTheDocument();
    expect(screen.getByTestId('play-button')).not.toHaveAttribute('title');
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

  describe('opening .spell files from the computer', () => {
    it('the picker only accepts .spell files', () => {
      renderWithProviders(<ReadOption dragActive={false} />);
      expect(screen.getByTestId('read-option-file-input')).toHaveAttribute('accept', '.spell');
    });

    it('imports a picked .spell (stored in the browser) and starts reading it', async () => {
      mockGetSpellById.mockResolvedValue({ id: 'imported-1', title: 'Imported', createdAt: new Date(), userId: undefined });
      const store = makeStore();
      renderWithProviders(<ReadOption dragActive={false} />, { store });
      fireEvent.change(screen.getByTestId('read-option-file-input'), { target: { files: [spellFile()] } });
      await waitFor(() => expect(store.getState().spellReader.spellId).toBe('imported-1'));
      expect(mockImportFile).toHaveBeenCalledWith(expect.objectContaining({ name: 'book.spell' }));
      expect(store.getState().browserPlayer.autoPlayOnLoad).toBe(true);
    });

    it('imports .spell files dropped on the tab', async () => {
      mockGetSpellById.mockResolvedValue({ id: 'imported-1', title: 'Imported', createdAt: new Date(), userId: undefined });
      const store = makeStore();
      renderWithProviders(<ReadOption dragActive={false} />, { store });
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
      renderWithProviders(<ReadOption dragActive={false} />, { store });
      await act(async () => { fireEvent.drop(screen.getByTestId('read-option'), fileDrag([spellFile('book.pdf')])); });
      expect(mockImportFile).not.toHaveBeenCalled();
      const responses = store.getState().apiResponses.responses;
      expect(responses[responses.length - 1]).toMatchObject({ type: 'error' });
    });

    it('does not start reading when the import fails', async () => {
      mockImportFile.mockResolvedValue(null);
      const store = makeStore();
      renderWithProviders(<ReadOption dragActive={false} />, { store });
      await act(async () => {
        fireEvent.change(screen.getByTestId('read-option-file-input'), { target: { files: [spellFile()] } });
      });
      await waitFor(() => expect(mockImportFile).toHaveBeenCalled());
      expect(mockGetSpellById).not.toHaveBeenCalledWith('imported-1', expect.anything());
      expect(store.getState().spellReader.spellId).toBeNull();
    });

    it('shows the importing state while a file is being imported', async () => {
      let finish: (id: string | null) => void = () => {};
      mockImportFile.mockReturnValue(new Promise(resolve => { finish = resolve; }));
      renderWithProviders(<ReadOption dragActive={false} />);
      fireEvent.change(screen.getByTestId('read-option-file-input'), { target: { files: [spellFile()] } });
      await waitFor(() => expect(screen.getByTestId('read-option-hint')).toHaveTextContent('Importing spell'));
      await act(async () => { finish(null); });
      expect(screen.getByTestId('read-option-hint')).not.toHaveTextContent('Importing spell');
    });
  });

  describe('unload button', () => {
    it('is only shown with a spell loaded, not while dragging', () => {
      const { unmount } = renderWithProviders(<ReadOption dragActive={false} />);
      expect(screen.queryByTestId('read-option-unload')).not.toBeInTheDocument();
      unmount();

      const store = makeStore();
      store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
      const { unmount: unmount2 } = renderWithProviders(<ReadOption dragActive={false} />, { store });
      expect(screen.getByTestId('read-option-unload')).toBeInTheDocument();
      unmount2();

      renderWithProviders(<ReadOption dragActive />, { store });
      expect(screen.queryByTestId('read-option-unload')).not.toBeInTheDocument();
    });

    it('takes the spell out of the player, back to the empty Read tab', () => {
      const store = makeStore();
      store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
      renderWithProviders(<ReadOption dragActive={false} />, { store });
      fireEvent.click(screen.getByTestId('read-option-unload'));
      expect(store.getState().spellReader.spellId).toBeNull();
      expect(screen.getByTestId('read-option-brand-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('read-option-unload')).not.toBeInTheDocument();
    });
  });
});
