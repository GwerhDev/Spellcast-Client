import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import type { Editor } from '@tiptap/react';
import { MagicTextEditor } from '../index';

const page = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });

// The editor instance Tiptap hangs on its own element.
const editorIn = (container: HTMLElement) => (container.querySelector('.ProseMirror') as (HTMLElement & { editor?: Editor }) | null)?.editor;

describe('MagicTextEditor', () => {
  // A spell opened (or a page switched to) is no edit: the Save button stays off.
  it('reports no change when a document is opened, or replaced from outside', async () => {
    const onChange = vi.fn();
    const { rerender, container } = render(<MagicTextEditor content={page('First page')} onChange={onChange} />);
    await vi.waitFor(() => expect(editorIn(container)).toBeTruthy());
    rerender(<MagicTextEditor content={page('Second page')} onChange={onChange} />);
    await vi.waitFor(() => expect(container.textContent).toContain('Second page'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports a change when the document is edited', async () => {
    const onChange = vi.fn();
    const { container } = render(<MagicTextEditor content={page('A page')} onChange={onChange} />);
    await vi.waitFor(() => expect(editorIn(container)).toBeTruthy());
    act(() => { editorIn(container)!.commands.insertContentAt(1, 'Edited: '); });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('reports no change for a selection that edits nothing', async () => {
    const onChange = vi.fn();
    const { container } = render(<MagicTextEditor content={page('A page')} onChange={onChange} />);
    await vi.waitFor(() => expect(editorIn(container)).toBeTruthy());
    act(() => { editorIn(container)!.commands.setTextSelection(3); });
    expect(onChange).not.toHaveBeenCalled();
  });
});
