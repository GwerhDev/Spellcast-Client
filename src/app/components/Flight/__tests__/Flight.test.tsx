import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Flight } from '../Flight';

const from = { top: 500, left: 100, width: 64, height: 64 };
const to = { top: 200, left: 400, width: 180, height: 180 };

describe('Flight', () => {
  it('draws what it carries over the page (portaled to body)', () => {
    render(<div><Flight from={from} target={() => to} onDone={vi.fn()}><span data-testid="cargo" /></Flight></div>);
    expect(screen.getByTestId('flight').parentElement).toBe(document.body);
    expect(screen.getByTestId('flight-front')).toContainElement(screen.getByTestId('cargo'));
  });

  it('has no back face unless it turns over on arrival', () => {
    const { rerender } = render(<Flight from={from} target={() => to} back={<span />} onDone={vi.fn()}>x</Flight>);
    expect(screen.queryByTestId('flight-back')).not.toBeInTheDocument();
    rerender(<Flight from={from} target={() => to} back={<span />} spin onDone={vi.fn()}>x</Flight>);
    expect(screen.getByTestId('flight-back')).toBeInTheDocument();
  });

  it('reports when it has arrived', async () => {
    const onDone = vi.fn();
    render(<Flight from={from} target={() => to} lift onDone={onDone}>x</Flight>);
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });
});
