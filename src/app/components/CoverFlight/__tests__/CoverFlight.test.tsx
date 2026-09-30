import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CoverFlight } from '../CoverFlight';

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
