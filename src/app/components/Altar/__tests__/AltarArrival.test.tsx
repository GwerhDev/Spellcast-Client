import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const reduced = vi.hoisted(() => ({ value: false }));
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => reduced.value,
}));

const { AltarArrival } = await import('../AltarArrival');

const from = { left: 40, top: 500, width: 120, height: 168 };
const to = { left: 400, top: 200, width: 80, height: 80 };

describe('AltarArrival', () => {
  it('draws the cover over the whole page, the way it goes', () => {
    reduced.value = false;
    render(<AltarArrival kind="drop" from={from} to={to} coverUrl="blob:cover" onDone={vi.fn()} />);
    const layer = screen.getByTestId('altar-arrival');
    expect(layer.parentElement).toBe(document.body);
    expect(layer).toHaveAttribute('data-kind', 'drop');
    expect(screen.getByTestId('altar-arrival-cover')).toHaveAttribute('src', 'blob:cover');
  });

  it('is a glow of light for a spell with no cover', () => {
    reduced.value = false;
    render(<AltarArrival kind="return" from={to} to={from} coverUrl={null} onDone={vi.fn()} />);
    expect(screen.queryByTestId('altar-arrival-cover')).toBeNull();
    expect(screen.getByTestId('altar-arrival-glow')).toBeInTheDocument();
  });

  it('without motion, is there at once: nothing drawn', () => {
    reduced.value = true;
    const onDone = vi.fn();
    render(<AltarArrival kind="flight" from={from} to={to} coverUrl="blob:cover" onDone={onDone} />);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('altar-arrival')).toBeNull();
  });
});
