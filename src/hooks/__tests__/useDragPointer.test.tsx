import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDragPointer } from '../useDragPointer';

// jsdom has no DragEvent; a MouseEvent of type dragover carries the same coordinates.
const dragOver = (x: number, y: number) =>
  document.dispatchEvent(new MouseEvent('dragover', { clientX: x, clientY: y }));

describe('useDragPointer', () => {
  it('reports the latest pointer position while active, once per frame', async () => {
    const onMove = vi.fn();
    renderHook(() => useDragPointer(true, onMove));
    dragOver(10, 20);
    dragOver(30, 40);
    await waitFor(() => expect(onMove).toHaveBeenCalledWith(30, 40));
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it('ignores the (0, 0) some browsers send as a drag ends', async () => {
    const onMove = vi.fn();
    renderHook(() => useDragPointer(true, onMove));
    dragOver(0, 0);
    await new Promise(r => setTimeout(r, 40));
    expect(onMove).not.toHaveBeenCalled();
  });

  it('does nothing while inactive, and stops listening when it turns off', async () => {
    const onMove = vi.fn();
    const { rerender } = renderHook(({ active }) => useDragPointer(active, onMove), { initialProps: { active: false } });
    dragOver(5, 5);
    await new Promise(r => setTimeout(r, 40));
    expect(onMove).not.toHaveBeenCalled();
    rerender({ active: true });
    rerender({ active: false });
    dragOver(6, 6);
    await new Promise(r => setTimeout(r, 40));
    expect(onMove).not.toHaveBeenCalled();
  });
});
