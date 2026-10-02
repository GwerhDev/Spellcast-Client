import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { beginTouchSpellDrag, isTouchDragging, LONG_PRESS_MS } from '../touchSpellDrag';
import { SPELL_DRAG_TYPE } from '../../config/consts';

// A touch on the document at a point (the drag listens for the finger there).
const touch = (type: 'touchmove' | 'touchend' | 'touchcancel', x: number, y: number) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: type === 'touchmove' ? [{ clientX: x, clientY: y }] : [] });
  document.dispatchEvent(event);
  return event;
};

describe('beginTouchSpellDrag', () => {
  let source: HTMLElement;
  let target: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    source = document.createElement('div');
    target = document.createElement('div');
    document.body.append(source, target);
    // The drop target under the finger wherever it goes.
    document.elementFromPoint = vi.fn(() => target);
  });
  afterEach(() => {
    vi.useRealTimers();
    source.remove();
    target.remove();
  });

  it('picks the card up after a long press and drops the spell on what\'s under the finger', () => {
    const dropped: string[] = [];
    target.addEventListener('dragover', e => e.preventDefault()); // takes the drop
    target.addEventListener('drop', e => dropped.push((e as DragEvent).dataTransfer!.getData(SPELL_DRAG_TYPE)));
    const onStart = vi.fn();
    beginTouchSpellDrag({ x: 10, y: 10 }, source, 'spell-1', { onStart });

    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onStart).toHaveBeenCalled();
    expect(isTouchDragging()).toBe(true);

    // Moving the finger moves the card, not the page.
    expect(touch('touchmove', 50, 200).defaultPrevented).toBe(true);
    touch('touchend', 50, 200);
    expect(dropped).toEqual(['spell-1']);
    expect(isTouchDragging()).toBe(false);
  });

  it('ends the drag on the card, as a mouse drag does', () => {
    const ended = vi.fn();
    source.addEventListener('dragend', ended);
    beginTouchSpellDrag({ x: 10, y: 10 }, source, 'spell-1', { onStart: () => {} });
    vi.advanceTimersByTime(LONG_PRESS_MS);
    touch('touchend', 10, 10);
    expect(ended).toHaveBeenCalled();
  });

  it('doesn\'t drop where nothing takes it', () => {
    const drop = vi.fn();
    target.addEventListener('drop', drop);
    beginTouchSpellDrag({ x: 10, y: 10 }, source, 'spell-1', { onStart: () => {} });
    vi.advanceTimersByTime(LONG_PRESS_MS);
    touch('touchmove', 40, 40);
    touch('touchend', 40, 40);
    expect(drop).not.toHaveBeenCalled();
  });

  it('is a scroll, not a drag, when the finger moves before the long press', () => {
    const onStart = vi.fn();
    beginTouchSpellDrag({ x: 10, y: 10 }, source, 'spell-1', { onStart });
    expect(touch('touchmove', 10, 60).defaultPrevented).toBe(false);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onStart).not.toHaveBeenCalled();
    expect(isTouchDragging()).toBe(false);
  });

  it('a quick tap is just a tap', () => {
    const onStart = vi.fn();
    beginTouchSpellDrag({ x: 10, y: 10 }, source, 'spell-1', { onStart });
    touch('touchend', 10, 10);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onStart).not.toHaveBeenCalled();
  });
});
