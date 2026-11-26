import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CountUp } from '../CountUp';

let frames: FrameRequestCallback[] = [];
const runFrame = (now: number) => act(() => { const due = frames; frames = []; due.forEach(cb => cb(now)); });

const reduceMotion = (reduce: boolean) =>
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduced-motion'), media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  }) as MediaQueryList);

describe('CountUp', () => {
  beforeEach(() => {
    frames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.push(cb); return frames.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('counts up from 0 to its value, ending exactly on it', () => {
    reduceMotion(false);
    render(<CountUp value={40} duration={100} />);
    expect(screen.getByTestId('count-up')).toHaveTextContent('0');
    runFrame(0);
    runFrame(50);
    const midway = Number(screen.getByTestId('count-up').textContent);
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(40);
    runFrame(100);
    expect(screen.getByTestId('count-up')).toHaveTextContent('40');
  });

  it('counts on from where it was when its value changes', () => {
    reduceMotion(false);
    const { rerender } = render(<CountUp value={10} duration={100} />);
    runFrame(0); runFrame(100);
    rerender(<CountUp value={20} duration={100} />);
    runFrame(200);
    expect(Number(screen.getByTestId('count-up').textContent)).toBeGreaterThanOrEqual(10);
    runFrame(300);
    expect(screen.getByTestId('count-up')).toHaveTextContent('20');
  });

  it('without motion, is just its value', () => {
    reduceMotion(true);
    render(<CountUp value={7} />);
    expect(screen.getByTestId('count-up')).toHaveTextContent('7');
  });
});
