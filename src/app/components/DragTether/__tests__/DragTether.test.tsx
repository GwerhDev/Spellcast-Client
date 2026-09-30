import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DragTether } from '../DragTether';

const dragOver = (x: number, y: number) =>
  document.dispatchEvent(new MouseEvent('dragover', { clientX: x, clientY: y }));

describe('DragTether', () => {
  it('is drawn over the page, hidden until the pointer is known', () => {
    render(<DragTether origin={{ x: 100, y: 100 }} />);
    const tether = screen.getByTestId('drag-tether');
    expect(tether.parentElement).toBe(document.body);
    expect(tether.getAttribute('class')).not.toMatch(/visible/);
  });

  it('draws a sagging thread from the origin to the pointer', async () => {
    render(<DragTether origin={{ x: 100, y: 100 }} />);
    dragOver(300, 100);
    await waitFor(() => expect(screen.getByTestId('drag-tether').getAttribute('class')).toMatch(/visible/));
    const d = screen.getByTestId('drag-tether-thread').getAttribute('d');
    // Starts at the origin, ends at the pointer, with its control point pulled down.
    expect(d).toMatch(/^M 100 100 Q 200 (\d+(\.\d+)?) 300 100$/);
    const controlY = Number(d!.split(' ')[5]);
    expect(controlY).toBeGreaterThan(100);
  });
});
