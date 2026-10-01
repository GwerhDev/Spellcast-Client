import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { Coverflow } from '../Coverflow';

const card = (id: string, onClick = vi.fn()) => ({ key: id, node: <button data-testid={`card-${id}`} onClick={onClick}>{id}</button> });
const empty = (key: string) => <div data-testid="empty-card">{key}</div>;
const labels = { previous: 'Previous', next: 'Next' };

// What sits at each place, from left to right, and which one is centered.
const row = () => screen.getAllByTestId('coverflow-place').map(el => el.textContent);
// A card leaving (going round the back) stays a moment while it fades out: wait for the
// row to settle on one centered card.
const centered = async () => {
  let text: string | null = null;
  await waitFor(() => {
    const atCenter = screen.getAllByTestId('coverflow-place').filter(el => el.getAttribute('data-offset') === '0');
    expect(atCenter).toHaveLength(1);
    text = atCenter[0].textContent;
  });
  return text;
};

describe('Coverflow', () => {
  it('always shows every place, filling the ones without an item', async () => {
    render(<Coverflow itemWidth="160px" slots={5} items={[card('a'), card('b')]} renderEmpty={empty} labels={labels} />);
    expect(screen.getAllByTestId('coverflow-place')).toHaveLength(5);
    expect(screen.getAllByTestId('empty-card')).toHaveLength(3);
    expect(await centered()).toBe('a');
  });

  it('wraps around: the first item has the last ones to its left', () => {
    render(<Coverflow itemWidth="160px" slots={5} items={['a', 'b', 'c', 'd', 'e', 'f'].map(id => card(id))} renderEmpty={empty} labels={labels} />);
    expect(row()).toEqual(['e', 'f', 'a', 'b', 'c']);
  });

  it('steps through the items with the arrows, never centering an empty place', async () => {
    render(<Coverflow itemWidth="160px" slots={5} items={[card('a'), card('b')]} renderEmpty={empty} labels={labels} />);
    fireEvent.click(screen.getByTestId('coverflow-next'));
    expect(await centered()).toBe('b');
    fireEvent.click(screen.getByTestId('coverflow-next'));
    expect(await centered()).toBe('a');
    fireEvent.click(screen.getByTestId('coverflow-prev'));
    expect(await centered()).toBe('b');
  });

  it('clicks on the front row reach its cards; a card behind it is brought to the center instead', async () => {
    const onB = vi.fn();
    const onC = vi.fn();
    render(<Coverflow itemWidth="160px" slots={5} items={[card('a'), card('b', onB), card('c', onC)]} renderEmpty={empty} labels={labels} />);
    // b sits beside the centered card, in the front row.
    fireEvent.click(screen.getByTestId('card-b'));
    expect(onB).toHaveBeenCalledTimes(1);
    expect(await centered()).toBe('a');
    // c sits behind it: brought to the center, without reaching it.
    fireEvent.click(screen.getByTestId('card-c'));
    expect(onC).not.toHaveBeenCalled();
    expect(await centered()).toBe('c');
  });

  it('with nothing to pick (loading, or a single item) there are no arrows', () => {
    const { rerender } = render(<Coverflow itemWidth="160px" slots={5} items={[]} interactive={false} renderEmpty={empty} />);
    expect(screen.getAllByTestId('empty-card')).toHaveLength(5);
    expect(screen.queryByTestId('coverflow-next')).not.toBeInTheDocument();
    rerender(<Coverflow itemWidth="160px" slots={5} items={[card('a')]} renderEmpty={empty} labels={labels} />);
    expect(screen.queryByTestId('coverflow-next')).not.toBeInTheDocument();
  });

  // The pointer resting toward an end keeps the row moving that way, and stops when it
  // comes back toward the middle or leaves. (jsdom has no layout: everything is 0 wide, so
  // any pointer off the very center counts as toward an end.)
  describe('moving on its own toward the end the pointer rests over', () => {
    const mouseAt = (clientX: number) =>
      fireEvent.pointerMove(screen.getByTestId('coverflow-stage'), { clientX, pointerType: 'mouse' });

    it('steps toward that end at once, and keeps stepping while the pointer stays', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        render(<Coverflow itemWidth="160px" slots={5} items={['a', 'b', 'c', 'd'].map(id => card(id))} renderEmpty={empty} labels={labels} />);
        mouseAt(400);
        expect(await centered()).toBe('b');
        await act(async () => { vi.advanceTimersByTime(520); });
        expect(await centered()).toBe('c');
        fireEvent.pointerLeave(screen.getByTestId('coverflow-stage'));
        await act(async () => { vi.advanceTimersByTime(2000); });
        expect(await centered()).toBe('c');
      } finally {
        vi.useRealTimers();
      }
    });

    it('goes the other way toward the other end', async () => {
      render(<Coverflow itemWidth="160px" slots={5} items={['a', 'b', 'c'].map(id => card(id))} renderEmpty={empty} labels={labels} />);
      mouseAt(-400);
      expect(await centered()).toBe('c');
    });

    it('only for a mouse: a touch on the row does not set it moving', async () => {
      render(<Coverflow itemWidth="160px" slots={5} items={['a', 'b'].map(id => card(id))} renderEmpty={empty} labels={labels} />);
      fireEvent.pointerMove(screen.getByTestId('coverflow-stage'), { clientX: 400, pointerType: 'touch' });
      expect(await centered()).toBe('a');
    });
  });

  // Without room for the full row (a phone): one card in front, swiped through, no arrows.
  describe('narrow', () => {
    const restore: Array<() => void> = [];
    const stubWidth = (prop: 'clientWidth' | 'offsetWidth', value: number) => {
      const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop)!;
      Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get: () => value });
      restore.push(() => Object.defineProperty(HTMLElement.prototype, prop, original));
    };
    beforeEach(() => {
      // A phone-wide row, and cards 160px wide.
      stubWidth('clientWidth', 390);
      stubWidth('offsetWidth', 160);
      vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
    });
    afterEach(() => { restore.splice(0).forEach(undo => undo()); vi.unstubAllGlobals(); });

    const items = ['a', 'b', 'c'].map(id => card(id));
    const swipe = (fromX: number, toX: number) => {
      const stage = screen.getByTestId('coverflow-stage');
      fireEvent.pointerDown(stage, { clientX: fromX, pointerType: 'touch' });
      fireEvent.pointerUp(stage, { clientX: toX, pointerType: 'touch' });
    };

    it('shows one card in front, and no arrows', async () => {
      render(<Coverflow itemWidth="160px" items={items} renderEmpty={empty} labels={labels} />);
      expect(screen.getByTestId('coverflow')).toHaveAttribute('data-layout', 'compact');
      // Measured once it's on the page: the wide row's outer places fade out.
      await waitFor(() => expect(screen.getAllByTestId('coverflow-place')).toHaveLength(5));
      expect(screen.queryByTestId('coverflow-next')).not.toBeInTheDocument();
      // The cards beside the centered one are behind it: a click brings them to the center.
      const onB = vi.fn();
      cleanup();
      render(<Coverflow itemWidth="160px" items={[card('a'), card('b', onB)]} renderEmpty={empty} labels={labels} />);
      fireEvent.click(screen.getByTestId('card-b'));
      expect(onB).not.toHaveBeenCalled();
    });

    it('a swipe to the left brings the next card, to the right the previous one', async () => {
      render(<Coverflow itemWidth="160px" items={items} renderEmpty={empty} labels={labels} />);
      swipe(300, 200);
      expect(await centered()).toBe('b');
      swipe(200, 300);
      expect(await centered()).toBe('a');
    });

    it('a short drag is not a swipe, and the tap ending a swipe does not open the card', async () => {
      const onC = vi.fn();
      render(<Coverflow itemWidth="160px" items={[card('a'), card('b'), card('c', onC)]} renderEmpty={empty} labels={labels} />);
      swipe(300, 290);
      expect(await centered()).toBe('a');
      swipe(200, 300);
      expect(await centered()).toBe('c');
      // The tap the browser sends at the end of that swipe lands on the card now in front.
      const front = () => screen.getAllByTestId('card-c').at(-1)!;
      fireEvent.click(front());
      expect(onC).not.toHaveBeenCalled();
      // A tap of its own opens it.
      fireEvent.click(front());
      expect(onC).toHaveBeenCalledTimes(1);
    });
  });
});

