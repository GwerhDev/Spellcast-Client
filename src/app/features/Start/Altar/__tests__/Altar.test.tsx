import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../../test/renderWithProviders';
import { setSpellFile, setSpellLoaded, setSentences, setCurrentSentenceIndex } from '../../../../../store/spellReaderSlice';
import { play, pause } from '../../../../../store/browserPlayerSlice';
import { play as playAudio, setAiTimeline, setCurrentTime } from '../../../../../store/audioPlayerSlice';
import { setSelectedVoice } from '../../../../../store/voiceSlice';
import { Routes, Route } from 'react-router-dom';
import { Altar } from '../index';
import { SPELL_DRAG_TYPE } from '../../../../../config/consts';

const mockGetSpellById = vi.fn();
const mockDeleteSpellFromDB = vi.fn();
vi.mock('../../../../../db', () => ({
  getSpellById: (...args: unknown[]) => mockGetSpellById(...args),
  // Covers are read through getSpellById here, so each test's own spell (and timing) applies.
  getSpellCover: (...args: unknown[]) => Promise.resolve(mockGetSpellById(...args)).then((d) => (d as { cover?: Blob } | null | undefined)?.cover ?? null),
  getCachedSpellCover: () => undefined,
  deleteSpellFromDB: (...args: unknown[]) => mockDeleteSpellFromDB(...args),
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
  mockDeleteSpellFromDB.mockReset().mockResolvedValue(undefined);
  URL.createObjectURL = vi.fn(() => 'blob:cover');
  URL.revokeObjectURL = vi.fn();
});

// Every render gets the menu callbacks; tests that care pass their own.
const Read = (props: Partial<React.ComponentProps<typeof Altar>>) => (
  <Altar onWrite={vi.fn()} onImport={vi.fn()} {...props} />
);

// A drag carrying a spell, as a SpellCard's dragstart sets it up.
const spellDrag = (id = 'spell-1') => ({
  dataTransfer: {
    types: [SPELL_DRAG_TYPE],
    getData: (type: string) => (type === SPELL_DRAG_TYPE ? id : ''),
    dropEffect: 'none',
  },
});
// A spell dragged onto the altar, and that drag ending (cancelled or dropped elsewhere).
const dragSpellOver = () => fireEvent.dragEnter(screen.getByTestId('altar'), spellDrag());
const endSpellDrag = () => act(() => { document.dispatchEvent(new Event('dragend', { bubbles: true })); });

describe('Altar', () => {
  describe('the Spellcast button menu (nothing loaded)', () => {
    const menuHidden = () => screen.getByTestId('radial-menu').getAttribute('aria-hidden') === 'true';

    it('shows the Spellcast mark; a click opens the menu instead of playing', () => {
      const store = makeStore();
      renderWithProviders(<Read />, { store });
      expect(screen.getByTestId('altar-brand-icon')).toBeInTheDocument();
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
      renderWithProviders(<Read />);
      fireEvent.click(screen.getByTestId('play-button'));
      expect(menuHidden()).toBe(false);
      dragSpellOver();
      expect(menuHidden()).toBe(true);
    });
  });

  describe('the beam of light from a dragged spell onto the button', () => {
    const dragOver = (x: number, y: number) =>
      document.dispatchEvent(new MouseEvent('dragover', { clientX: x, clientY: y }));

    it('runs from the pointer to the button while a spell is dragged over the altar; the button stays put', async () => {
      renderWithProviders(<Read />);
      dragSpellOver();
      const panel = screen.getByTestId('altar');
      const stage = screen.getByTestId('altar-stage');
      // jsdom lays everything out at (0, 0): the pointer is straight below the button.
      dragOver(0, 100);
      await waitFor(() => expect(panel.style.getPropertyValue('--beam-length')).toBe('100.0px'));
      expect(panel.style.getPropertyValue('--beam-angle')).toBe('90.0deg');
      expect(panel.style.getPropertyValue('--spark-y')).toBe('100.0px');
      expect(panel.style.getPropertyValue('--beam-opacity')).toBe('1');
      expect(Number(stage.style.getPropertyValue('--proximity'))).toBeGreaterThan(0);
      endSpellDrag();
      expect(panel.style.getPropertyValue('--beam-opacity')).toBe('');
      expect(stage.style.getPropertyValue('--proximity')).toBe('');
    });

    it('stays hidden when nothing is being dragged over', async () => {
      renderWithProviders(<Read />);
      dragOver(0, 100);
      await new Promise(r => setTimeout(r, 40));
      expect(screen.getByTestId('altar').style.getPropertyValue('--beam-opacity')).toBe('');
    });
  });

  // The center and footer swap one out, then the next in (see AltarPanel): the new one is
  // awaited, not expected in the same instant.
  it('turns back into a play button while a spell is dragged over', async () => {
    renderWithProviders(<Read />);
    dragSpellOver();
    expect(await screen.findByTestId('altar-hint')).toHaveTextContent('Drop it');
    await waitFor(() => expect(screen.queryByTestId('altar-brand-icon')).not.toBeInTheDocument());
    expect(await screen.findByTestId('play-button-shape')).toBeInTheDocument();
    expect(screen.queryByTestId('play-button')).not.toBeInTheDocument();
  });

  it('shows the loaded spell with a display-only waveform instead of the play button', () => {
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<Read />, { store });
    expect(screen.getByTestId('altar-title')).toHaveTextContent('Spell one');
    expect(screen.queryByTestId('altar-hint')).not.toBeInTheDocument();
    expect(screen.queryByTestId('altar-brand-icon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('play-button')).not.toBeInTheDocument();
    const wave = screen.getByTestId('altar-wave');
    expect(wave.tagName).not.toBe('BUTTON');
    const before = store.getState().browserPlayer.toggleSeq;
    fireEvent.click(wave);
    expect(store.getState().browserPlayer.toggleSeq).toBe(before);
  });

  describe('the sentence being read', () => {
    const loadedWith = (sentences: string[]) => {
      const store = makeStore();
      store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
      store.dispatch(setSpellLoaded(true));
      store.dispatch(setSentences({ sentences, startIndex: 0 }));
      return store;
    };

    it('replaces the status and title while playing, and they come back when paused', async () => {
      const store = loadedWith(['The first sentence.', 'The second one.']);
      renderWithProviders(<Read />, { store });
      expect(screen.getByTestId('altar-title')).toHaveTextContent('Spell one');
      expect(screen.queryByTestId('altar-sentence')).not.toBeInTheDocument();

      act(() => { store.dispatch(play()); });
      expect(await screen.findByTestId('altar-sentence')).toHaveTextContent('The first sentence.');
      expect(screen.queryByTestId('altar-title')).not.toBeInTheDocument();

      act(() => { store.dispatch(setCurrentSentenceIndex(1)); });
      expect(screen.getByTestId('altar-sentence')).toHaveTextContent('The second one.');

      act(() => { store.dispatch(pause()); });
      expect(await screen.findByTestId('altar-title')).toHaveTextContent('Spell one');
      expect(screen.queryByTestId('altar-sentence')).not.toBeInTheDocument();
    });

    it("follows a provider voice's timeline by its playback time", () => {
      const store = loadedWith([]);
      store.dispatch(setSelectedVoice({ type: 'ai', value: 'provider-voice' }));
      store.dispatch(setAiTimeline([{ text: 'Recorded one.', start: 0, end: 1000 }, { text: 'Recorded two.', start: 1000, end: 2000 }]));
      store.dispatch(playAudio());
      renderWithProviders(<Read />, { store });
      expect(screen.getByTestId('altar-sentence')).toHaveTextContent('Recorded one.');
      act(() => { store.dispatch(setCurrentTime(1.5)); });
      expect(screen.getByTestId('altar-sentence')).toHaveTextContent('Recorded two.');
    });

    it('keeps the status and title while playing with nothing to show yet', () => {
      const store = loadedWith([]);
      store.dispatch(play());
      renderWithProviders(<Read />, { store });
      expect(screen.queryByTestId('altar-sentence')).not.toBeInTheDocument();
      expect(screen.getByTestId('altar-title')).toBeInTheDocument();
    });
  });

  it('animates the waveform only while reading', () => {
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<Read />, { store });
    const wave = () => screen.getByTestId('altar-wave').querySelector('[data-testid="waveform"]')!;
    expect(wave().className).toMatch(/idle/);
    act(() => { store.dispatch(play()); });
    expect(wave().className).toMatch(/active/);
  });

  it('brings the play button back as the drop target while a spell is dragged over a loaded one', async () => {
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<Read />, { store });
    dragSpellOver();
    expect(await screen.findByTestId('play-button-shape')).toBeInTheDocument();
    expect(screen.queryByTestId('altar-wave')).not.toBeInTheDocument();
  });

  it('as the drop target it always shows play, even while the loaded spell plays, and clicking it does nothing', async () => {
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    store.dispatch(play());
    renderWithProviders(<Read />, { store });
    dragSpellOver();
    const shape = await screen.findByTestId('play-button-shape');
    expect(shape.querySelector('[data-icon="play"]')).toBeInTheDocument();
    expect(shape.querySelector('[data-icon="pause"]')).not.toBeInTheDocument();
    const before = store.getState().browserPlayer.toggleSeq;
    fireEvent.click(shape);
    expect(store.getState().browserPlayer.toggleSeq).toBe(before);
    expect(store.getState().browserPlayer.isPlaying).toBe(true);
  });

  it('fills the panel with the loaded spell cover, when it has one', async () => {
    mockGetSpellById.mockResolvedValue({ id: 'spell-1', title: 'Spell one', cover: new Blob(['x']) });
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<Read />, { store });
    const cover = await screen.findByTestId('altar-cover');
    expect(cover.style.backgroundImage).toContain('blob:cover');
  });

  it('has no cover with nothing loaded, or when the spell has none', async () => {
    mockGetSpellById.mockResolvedValue({ id: 'spell-1', title: 'Spell one' });
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<Read />, { store });
    await waitFor(() => expect(mockGetSpellById).toHaveBeenCalled());
    expect(screen.queryByTestId('altar-cover')).not.toBeInTheDocument();
  });

  it('shows the status line: playing vs paused', () => {
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<Read />, { store });
    expect(screen.getByTestId('altar-now')).toHaveTextContent('Paused');
    act(() => { store.dispatch(play()); });
    expect(screen.getByTestId('altar-now')).toHaveTextContent('Reading');
  });

  it('has a transparent panel (no box) while nothing is loaded', () => {
    renderWithProviders(<Read />);
    expect(screen.getByTestId('altar').className).toMatch(/noCover/);
  });

  it('keeps the panel transparent for a loaded spell without a cover', async () => {
    mockGetSpellById.mockResolvedValue({ id: 'spell-1', title: 'Spell one' });
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<Read />, { store });
    await waitFor(() => expect(mockGetSpellById).toHaveBeenCalled());
    expect(screen.getByTestId('altar').className).toMatch(/noCover/);
  });

  it('shows the panel once the loaded spell has a cover', async () => {
    mockGetSpellById.mockResolvedValue({ id: 'spell-1', title: 'Spell one', cover: new Blob(['x']) });
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<Read />, { store });
    await screen.findByTestId('altar-cover');
    expect(screen.getByTestId('altar').className).not.toMatch(/noCover/);
  });

  describe('open-in-reader shortcut', () => {
    it('is not shown with nothing loaded', () => {
      renderWithProviders(<Read />);
      expect(screen.queryByTestId('altar-open-reader')).not.toBeInTheDocument();
    });

    it('is hidden while a spell is dragged over', () => {
      const store = makeStore();
      store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
      renderWithProviders(<Read />, { store });
      dragSpellOver();
      expect(screen.queryByTestId('altar-open-reader')).not.toBeInTheDocument();
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
      fireEvent.click(screen.getByTestId('altar-open-reader'));
      expect(screen.getByTestId('reader-route')).toBeInTheDocument();
    });
  });

  describe("the loaded spell's edit and delete shortcuts", () => {
    // A caster's own spell by default; `owner` loads someone else's.
    const loaded = (owner = 'user-1') => {
      const store = makeStore();
      store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { id: 'user-1', loader: false } } });
      store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one', userId: owner }));
      return store;
    };

    it('are not shown with nothing loaded', () => {
      renderWithProviders(<Read />);
      expect(screen.queryByTestId('altar-edit')).not.toBeInTheDocument();
      expect(screen.queryByTestId('altar-delete')).not.toBeInTheDocument();
    });

    it("are not shown for a spell outside the caster's grimoire (the reader shortcut still is)", () => {
      renderWithProviders(<Read />, { store: loaded('user-2') });
      expect(screen.getByTestId('altar-open-reader')).toBeInTheDocument();
      expect(screen.queryByTestId('altar-edit')).not.toBeInTheDocument();
      expect(screen.queryByTestId('altar-delete')).not.toBeInTheDocument();
    });

    it('edit opens the loaded spell in the editor', () => {
      renderWithProviders(
        <Routes>
          <Route path="/" element={<Read />} />
          <Route path="/editor/:id" element={<div data-testid="editor-route" />} />
        </Routes>,
        { store: loaded() },
      );
      fireEvent.click(screen.getByTestId('altar-edit'));
      expect(screen.getByTestId('editor-route')).toBeInTheDocument();
    });

    it('delete asks first, then deletes the spell and unloads it', async () => {
      const store = loaded();
      renderWithProviders(<Read />, { store });
      fireEvent.click(screen.getByTestId('altar-delete'));
      expect(mockDeleteSpellFromDB).not.toHaveBeenCalled();
      fireEvent.click(screen.getByTestId('delete-confirm-confirm-btn'));
      await waitFor(() => expect(store.getState().spellReader.spellId).toBeNull());
      expect(mockDeleteSpellFromDB).toHaveBeenCalledWith('spell-1', 'user-1');
    });
  });

  describe('dropping a spell from the grimoire (the whole panel is the drop target)', () => {
    const readable = { id: 'spell-1', userId: undefined, title: 'Spell one', createdAt: new Date(), pagesContent: '["a"]' };

    it('lights up for a spell dragged over it, but not for other drags', () => {
      renderWithProviders(<Read />);
      const altar = screen.getByTestId('altar');
      fireEvent.dragEnter(altar, { dataTransfer: { types: ['text/plain'] } });
      expect(altar.className).not.toMatch(/dragActive/);
      dragSpellOver();
      expect(altar.className).toMatch(/dragActive/);
      expect(screen.getByTestId('altar-hint')).toHaveTextContent('Drop it');
    });

    it('starts reading the dropped spell without navigating', async () => {
      mockGetSpellById.mockResolvedValue(readable);
      const store = makeStore();
      renderWithProviders(<Read />, { store });
      dragSpellOver();
      await act(async () => { fireEvent.drop(screen.getByTestId('altar'), spellDrag()); });
      await waitFor(() => expect(store.getState().spellReader.spellId).toBe('spell-1'));
      expect(mockGetSpellById).toHaveBeenCalledWith('spell-1', undefined);
      expect(store.getState().browserPlayer.autoPlayOnLoad).toBe(true);
      expect(screen.getByTestId('altar').className).not.toMatch(/dragActive/);
    });

    it('dropping the spell that is already playing does not pause it', async () => {
      mockGetSpellById.mockResolvedValue(readable);
      const store = makeStore();
      renderWithProviders(<Read />, { store });
      await act(async () => { fireEvent.drop(screen.getByTestId('altar'), spellDrag()); });
      await waitFor(() => expect(store.getState().spellReader.spellId).toBe('spell-1'));
      act(() => {
        store.dispatch(setSpellLoaded(true));
        store.dispatch(play());
      });
      const { toggleSeq, resumeSeq } = store.getState().browserPlayer;
      dragSpellOver();
      await act(async () => { fireEvent.drop(screen.getByTestId('altar'), spellDrag()); });
      expect(store.getState().browserPlayer.toggleSeq).toBe(toggleSeq);
      expect(store.getState().browserPlayer.resumeSeq).toBe(resumeSeq);
      expect(store.getState().browserPlayer.isPlaying).toBe(true);
    });

    describe('drag state', () => {
      // jsdom has no DragEvent, so fireEvent.dragLeave drops relatedTarget; build the leave
      // as a MouseEvent (which carries it) with the drag's dataTransfer attached.
      const dragLeave = (el: Element, relatedTarget: EventTarget | null) => {
        const event = new MouseEvent('dragleave', { bubbles: true, relatedTarget });
        Object.defineProperty(event, 'dataTransfer', { value: spellDrag().dataTransfer });
        act(() => { el.dispatchEvent(event); });
      };
      const isLit = () => /dragActive/.test(screen.getByTestId('altar').className);

      it('stays active while moving between elements inside the panel', () => {
        renderWithProviders(<Read />);
        dragSpellOver();
        dragLeave(screen.getByTestId('altar'), screen.getByTestId('play-button'));
        expect(isLit()).toBe(true);
      });

      // An element a drag entered through can be removed mid-drag, and its dragleave never
      // comes -- so the state relies on relatedTarget, not on counting enter/leave pairs.
      it('ends when the drag leaves the panel', () => {
        renderWithProviders(<Read />);
        dragSpellOver();
        dragLeave(screen.getByTestId('altar'), document.body);
        expect(isLit()).toBe(false);
      });

      it('ends when the drag is cancelled or dropped elsewhere (dragend)', () => {
        renderWithProviders(<Read />);
        dragSpellOver();
        endSpellDrag();
        expect(isLit()).toBe(false);
      });
    });
  });

  describe('immersive: the loaded spell\'s actions ring the center', () => {
    const loaded = () => {
      const store = makeStore();
      store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { id: 'user-1', loader: false } } });
      store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one', userId: 'user-1' }));
      return store;
    };
    const ringOpen = () => screen.getByTestId('radial-menu').getAttribute('aria-hidden') === 'false';

    it('shows them around the center instead of in the corners, always open', () => {
      renderWithProviders(<Read immersive />, { store: loaded() });
      expect(screen.queryByTestId('altar-unload')).not.toBeInTheDocument();
      expect(screen.queryByTestId('altar-open-reader')).not.toBeInTheDocument();
      expect(ringOpen()).toBe(true);
      // The spell's info and Import first (no Write), the spell's own actions, and unloading it last.
      const order = Array.from(screen.getByTestId('radial-menu').querySelectorAll('[data-testid^="radial-menu-item-"]'))
        .map(el => el.getAttribute('data-testid')!.replace('radial-menu-item-', ''));
      expect(order).toEqual(['info', 'import', 'reader', 'edit', 'delete', 'unload']);
      // Escape doesn't close it.
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(ringOpen()).toBe(true);
    });

    it('Import opens its modal through Start, like the Spellcast button\'s menu', () => {
      const onImport = vi.fn();
      renderWithProviders(<Read immersive onImport={onImport} />, { store: loaded() });
      fireEvent.click(screen.getByTestId('radial-menu-item-import'));
      expect(onImport).toHaveBeenCalled();
      expect(ringOpen()).toBe(true);
    });

    it('Info opens the loaded spell\'s page', () => {
      renderWithProviders(
        <Routes>
          <Route path="/" element={<Read immersive />} />
          <Route path="/spell/:id" element={<div data-testid="spell-page" />} />
        </Routes>,
        { store: loaded() },
      );
      fireEvent.click(screen.getByTestId('radial-menu-item-info'));
      expect(screen.getByTestId('spell-page')).toBeInTheDocument();
    });

    it('steps aside while the pointer rests', () => {
      const store = loaded();
      const { rerender } = renderWithProviders(<Read immersive />, { store });
      rerender(<Read immersive idle />);
      expect(ringOpen()).toBe(false);
    });

    it('unload and delete work from the ring', async () => {
      const store = loaded();
      renderWithProviders(<Read immersive />, { store });
      fireEvent.click(screen.getByTestId('radial-menu-item-delete'));
      expect(screen.getByTestId('delete-confirm-confirm-btn')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('delete-confirm-cancel-btn'));
      fireEvent.click(screen.getByTestId('radial-menu-item-unload'));
      expect(store.getState().spellReader.spellId).toBeNull();
    });

    it("offers no edit/delete for a spell outside the caster's grimoire", () => {
      const store = makeStore();
      store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { id: 'user-1', loader: false } } });
      store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one', userId: 'user-2' }));
      renderWithProviders(<Read immersive />, { store });
      expect(screen.getByTestId('radial-menu-item-reader')).toBeInTheDocument();
      expect(screen.queryByTestId('radial-menu-item-edit')).not.toBeInTheDocument();
      expect(screen.queryByTestId('radial-menu-item-delete')).not.toBeInTheDocument();
    });
  });

  describe('dropping .spell files from the computer', () => {
    it('imports .spell files dropped on it (stored in the browser) and starts reading the first', async () => {
      mockGetSpellById.mockResolvedValue({ id: 'imported-1', title: 'Imported', createdAt: new Date(), userId: undefined });
      const store = makeStore();
      renderWithProviders(<Read />, { store });
      const option = screen.getByTestId('altar');
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
      await act(async () => { fireEvent.drop(screen.getByTestId('altar'), fileDrag([spellFile('book.pdf')])); });
      expect(mockImportFile).not.toHaveBeenCalled();
      const responses = store.getState().apiResponses.responses;
      expect(responses[responses.length - 1]).toMatchObject({ type: 'error' });
    });

    it('does not start reading when the import fails', async () => {
      mockImportFile.mockResolvedValue(null);
      const store = makeStore();
      renderWithProviders(<Read />, { store });
      await act(async () => { fireEvent.drop(screen.getByTestId('altar'), fileDrag([spellFile()])); });
      await waitFor(() => expect(mockImportFile).toHaveBeenCalled());
      expect(mockGetSpellById).not.toHaveBeenCalledWith('imported-1', expect.anything());
      expect(store.getState().spellReader.spellId).toBeNull();
    });

    it('shows the importing state while a file is being imported', async () => {
      let finish: (id: string | null) => void = () => {};
      mockImportFile.mockReturnValue(new Promise(resolve => { finish = resolve; }));
      renderWithProviders(<Read />);
      fireEvent.drop(screen.getByTestId('altar'), fileDrag([spellFile()]));
      await waitFor(() => expect(screen.getByTestId('altar-hint')).toHaveTextContent('Importing spell'));
      await act(async () => { finish(null); });
      expect(screen.getByTestId('altar-hint')).not.toHaveTextContent('Importing spell');
    });
  });

  describe('unload button', () => {
    it('is only shown with a spell loaded, not while dragging', () => {
      const { unmount } = renderWithProviders(<Read />);
      expect(screen.queryByTestId('altar-unload')).not.toBeInTheDocument();
      unmount();

      const store = makeStore();
      store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
      const { unmount: unmount2 } = renderWithProviders(<Read />, { store });
      expect(screen.getByTestId('altar-unload')).toBeInTheDocument();
      unmount2();

      renderWithProviders(<Read />, { store });

      dragSpellOver();
      expect(screen.queryByTestId('altar-unload')).not.toBeInTheDocument();
    });

    it('takes the spell out of the player, back to the empty Read tab', async () => {
      const store = makeStore();
      store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
      renderWithProviders(<Read />, { store });
      fireEvent.click(screen.getByTestId('altar-unload'));
      expect(store.getState().spellReader.spellId).toBeNull();
      expect(await screen.findByTestId('altar-brand-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('altar-unload')).not.toBeInTheDocument();
    });
  });
});
