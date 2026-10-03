import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { renderWithProviders } from '../../../../../test/renderWithProviders';
import type { PdfPanelOptions } from '../index';

// The editor itself (Tiptap) isn't what's tested: its page content is a stand-in, inside
// the same wrapper the real one draws it in, after its toolbar.
vi.mock('../../../../../magictext', () => ({
  MagicTextEditor: ({ wrapContent, toolbarClassName }: { wrapContent: (content: ReactNode) => ReactNode; toolbarClassName?: string }) => (
    <>
      <div data-testid="text-toolbar" className={toolbarClassName} />
      {wrapContent(<div data-testid="page-content" />)}
    </>
  ),
  VerticalRuler: () => <div data-testid="v-ruler" />,
}));
const narrow = { value: true };
vi.mock('../../../../../hooks/useMediaQuery', () => ({ useMediaQuery: () => narrow.value }));
vi.mock('../../../../../hooks/useOriginalPdf', () => ({ useOriginalPdf: (id: string | null) => (id ? { status: 'loading' } : null) }));

// The editor's width, as the ResizeObserver reports it.
let editorWidth = 1400;
class FakeResizeObserver {
  constructor(private cb: ResizeObserverCallback) {}
  observe() { this.cb([{ contentRect: { width: editorWidth } } as ResizeObserverEntry], this as unknown as ResizeObserver); }
  disconnect() {}
  unobserve() {}
}

const { SpellEditor } = await import('../index');

const page = { type: 'doc', content: [{ type: 'paragraph' }] };
const options = (overrides: Partial<PdfPanelOptions> = {}): PdfPanelOptions => ({
  spellId: 'spell-1', hasOriginal: true, onReplacePdf: vi.fn(), onRestorePage: vi.fn(), onRestoreAll: vi.fn(), ...overrides,
});
const editor = (pdfPanel: PdfPanelOptions | null) => (
  <SpellEditor pageNumber={1} pageContent={page} onPageContentChange={vi.fn()} pdfPanel={pdfPanel} />
);

describe('SpellEditor with the original PDF open', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('on a wide screen, opens a panel of its own beside the editor, with its own toolbar', async () => {
    narrow.value = false; editorWidth = 1400;
    const opts = options();
    const { rerender } = renderWithProviders(editor(null));
    expect(screen.queryByTestId('original-pdf-panel')).toBeNull();

    rerender(editor(opts));
    await act(async () => { vi.advanceTimersByTime(50); });
    expect(screen.getByTestId('spell-editor').dataset.pdf).toBe('side');
    expect(screen.getByTestId('original-pdf-panel')).toBeInTheDocument();
    // The text editor keeps its own toolbar, and the sheet doesn't turn.
    expect(screen.getByTestId('text-toolbar').className).toBe('');
    expect(screen.getByTestId('spell-editor-stage').dataset.flipped).toBeUndefined();

    fireEvent.click(screen.getByTestId('pdf-replace-btn'));
    fireEvent.click(screen.getByTestId('pdf-restore-page-btn'));
    fireEvent.click(screen.getByTestId('pdf-restore-all-btn'));
    expect(opts.onReplacePdf).toHaveBeenCalled();
    expect(opts.onRestorePage).toHaveBeenCalled();
    expect(opts.onRestoreAll).toHaveBeenCalled();

    rerender(editor(null));
    await act(async () => { vi.advanceTimersByTime(50); });
    expect(screen.queryByTestId('original-pdf-panel')).toBeNull();
  });

  it('offers to import a PDF when the spell has none', async () => {
    narrow.value = false; editorWidth = 1400;
    renderWithProviders(editor(options({ hasOriginal: false, onRestorePage: undefined, onRestoreAll: undefined })));
    await act(async () => { vi.advanceTimersByTime(50); });
    expect(screen.getByTestId('original-pdf-none')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-restore-all-btn')).toBeNull();
  });

  it('without room, turns the sheet over to the PDF, its toolbar in the text toolbar\'s place, and back', async () => {
    narrow.value = true; editorWidth = 390;
    const { rerender } = renderWithProviders(editor(null));
    const stage = () => screen.getByTestId('spell-editor-stage');

    rerender(editor(options()));
    await act(async () => { vi.advanceTimersByTime(50); });
    expect(stage().dataset.compare).toBe('flip');
    expect(stage().dataset.flipped).toBe('true');
    expect(screen.getByTestId('original-pdf-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('text-toolbar').className).not.toBe('');

    // Turning back: still the flip, the PDF still on the back, until the turn is over.
    rerender(editor(null));
    await act(async () => { vi.advanceTimersByTime(100); });
    expect(stage().dataset.compare).toBe('flip');
    expect(stage().dataset.flipped).toBeUndefined();
    expect(screen.getByTestId('original-pdf-sheet')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-toolbar')).toBeNull();

    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(stage().dataset.compare).toBeUndefined();
    expect(screen.queryByTestId('original-pdf-sheet')).toBeNull();
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });
});
