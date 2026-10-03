import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useRef } from 'react';
import { useGridDeal, dealDelay, dealTilt } from '../useGridDeal';

const Grid = ({ ready, count }: { ready: boolean; count: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  useGridDeal(ref, ready);
  return <div ref={ref}>{Array.from({ length: count }, (_, i) => <div key={i} />)}</div>;
};

describe('useGridDeal', () => {
  const animate = vi.fn();
  afterEach(() => {
    animate.mockReset();
    delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
  });

  it('deals each card once the grid is ready, in order, and only that first time', () => {
    (HTMLElement.prototype as unknown as { animate: typeof animate }).animate = animate;
    const { rerender } = render(<Grid ready={false} count={3} />);
    expect(animate).not.toHaveBeenCalled();
    rerender(<Grid ready count={3} />);
    expect(animate).toHaveBeenCalledTimes(3);
    expect(animate.mock.calls.map(c => c[1].delay)).toEqual([0, 55, 110]);
    expect(animate.mock.calls[0][1]).toMatchObject({ fill: 'backwards' });
    rerender(<Grid ready count={5} />);
    expect(animate).toHaveBeenCalledTimes(3);
  });

  it('stops staggering after the first cards', () => {
    expect(dealDelay(18)).toBe(dealDelay(40));
  });

  it('tilts the cards to alternating sides, the same every time', () => {
    expect(Math.sign(dealTilt(0))).toBe(-Math.sign(dealTilt(1)));
    expect(dealTilt(3)).toBe(dealTilt(3));
  });
});
