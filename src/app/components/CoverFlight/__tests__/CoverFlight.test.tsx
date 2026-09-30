import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CoverFlight } from '../CoverFlight';
import { liveRect } from '../flightRect';

const from = { top: 500, left: 100, width: 160, height: 240 };
const to = { top: 200, left: 400, width: 150, height: 206 };

describe('CoverFlight', () => {
  it('draws the image over the page (portaled to body)', () => {
    render(<div data-testid="host"><CoverFlight src="blob:cover" from={from} target={() => to} onDone={vi.fn()} /></div>);
    const img = screen.getByTestId('cover-flight');
    expect(img.parentElement).toBe(document.body);
    expect(img).toHaveAttribute('src', 'blob:cover');
  });

  it('reports when it has arrived', async () => {
    const onDone = vi.fn();
    render(<CoverFlight src="blob:cover" from={from} target={() => to} lift onDone={onDone} />);
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('follows its destination if it moved on the way, before landing', async () => {
    const onDone = vi.fn();
    let dest = to;
    const target = vi.fn(() => dest);
    render(<CoverFlight src="blob:cover" from={from} target={target} onDone={onDone} />);
    dest = { ...to, top: to.top - 40 };
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    // Read at takeoff, on arrival (moved: a follow-up leg), and on arriving again.
    expect(target.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});

describe('liveRect', () => {
  const fallback = { top: 1, left: 2, width: 3, height: 4 };
  const at = (top: number, left: number) => {
    const el = document.createElement('div');
    el.getBoundingClientRect = () => ({ top, left, width: 80, height: 120, right: left + 80, bottom: top + 120, x: left, y: top, toJSON: () => ({}) });
    return el;
  };

  // The card under the modal can move while it's open (e.g. the home page turning
  // immersive); flying back must aim at where it is now.
  it("measures an element that's still on the page, where it is now", () => {
    const el = at(300, 40);
    document.body.appendChild(el);
    expect(liveRect(el, fallback)).toEqual({ top: 300, left: 40, width: 80, height: 120 });
    el.remove();
  });

  it('falls back to where it last was once the element is gone', () => {
    expect(liveRect(at(300, 40), fallback)).toEqual(fallback);
    expect(liveRect(null, fallback)).toEqual(fallback);
  });
});
