import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpellDrag, NEAR_BOTTOM_PX } from '../useSpellDrag';
import { SPELL_DRAG_TYPE } from '../../config/consts';

// jsdom has no DragEvent: a MouseEvent with the drag's dataTransfer attached.
const drag = (type: string, init: MouseEventInit = {}, types: string[] = [SPELL_DRAG_TYPE]) => {
  const event = new MouseEvent(type, { bubbles: true, ...init });
  Object.defineProperty(event, 'dataTransfer', { value: { types } });
  act(() => { document.dispatchEvent(event); });
};

describe('useSpellDrag', () => {
  it('is idle until a spell is dragged over the page', () => {
    const { result } = renderHook(() => useSpellDrag());
    expect(result.current).toEqual({ active: false, nearBottom: false });
    drag('dragover', { clientX: 10, clientY: 10 }, ['Files']);
    expect(result.current.active).toBe(false);
  });

  it('tracks whether the dragged spell is near the bottom of the window', () => {
    const { result } = renderHook(() => useSpellDrag());
    drag('dragover', { clientX: 10, clientY: 10 });
    expect(result.current).toEqual({ active: true, nearBottom: false });
    drag('dragover', { clientX: 10, clientY: window.innerHeight - NEAR_BOTTOM_PX + 5 });
    expect(result.current).toEqual({ active: true, nearBottom: true });
  });

  it('ends when the spell is dropped, the drag is cancelled, or it leaves the window', () => {
    const { result } = renderHook(() => useSpellDrag());
    drag('dragover', { clientX: 10, clientY: 10 });
    drag('drop');
    expect(result.current.active).toBe(false);

    drag('dragover', { clientX: 10, clientY: 10 });
    drag('dragend');
    expect(result.current.active).toBe(false);

    drag('dragover', { clientX: 10, clientY: 10 });
    drag('dragleave', { clientX: 10, clientY: 10 });
    expect(result.current.active).toBe(true);
    drag('dragleave', { clientX: 10, clientY: -1 });
    expect(result.current.active).toBe(false);
  });
});
