import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { faPen, faUpload } from '@fortawesome/free-solid-svg-icons';
import { RadialMenu } from '../RadialMenu';

const makeItems = () => [
  { id: 'write', label: 'Write', icon: faPen, onSelect: vi.fn() },
  { id: 'import', label: 'Import', icon: faUpload, onSelect: vi.fn() },
];

describe('RadialMenu', () => {
  it('is hidden and not focusable while closed', () => {
    render(<RadialMenu open={false} items={makeItems()} onClose={vi.fn()} />);
    expect(screen.getByTestId('radial-menu')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('radial-menu-item-write')).toHaveAttribute('tabindex', '-1');
  });

  it('runs the picked option and closes', () => {
    const items = makeItems();
    const onClose = vi.fn();
    render(<RadialMenu open items={items} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('radial-menu-item-import'));
    expect(items[1].onSelect).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape and on a click outside, but not on its anchor', () => {
    const onClose = vi.fn();
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    render(<RadialMenu open items={makeItems()} onClose={onClose} anchorRef={{ current: anchor }} />);
    fireEvent.mouseDown(anchor);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('spreads the options over the arc', () => {
    render(<RadialMenu open items={makeItems()} onClose={vi.fn()} radius={100} startAngle={180} endAngle={0} />);
    expect(screen.getByTestId('radial-menu-item-write').style.getPropertyValue('--x')).toBe('-100px');
    expect(screen.getByTestId('radial-menu-item-import').style.getPropertyValue('--x')).toBe('100px');
  });

  // Options with an angle of their own sit there; the rest share the arc among themselves.
  it('places an option with its own angle there, the others along the arc', () => {
    const items = [
      { id: 'a', label: 'A', icon: faPen, onSelect: vi.fn() },
      // Outside the arc (180 -> 0): sharing it, it would sit at 90, not here.
      { id: 'apart', label: 'Apart', icon: faUpload, onSelect: vi.fn(), angle: 270 },
      { id: 'b', label: 'B', icon: faPen, onSelect: vi.fn() },
    ];
    render(<RadialMenu open items={items} onClose={vi.fn()} radius={100} startAngle={180} endAngle={0} />);
    expect(screen.getByTestId('radial-menu-item-a').style.getPropertyValue('--x')).toBe('-100px');
    expect(screen.getByTestId('radial-menu-item-b').style.getPropertyValue('--x')).toBe('100px');
    expect(screen.getByTestId('radial-menu-item-apart').style.getPropertyValue('--y')).toBe('-100px');
  });

  it('marks a way out apart from the other options', () => {
    const items = [...makeItems(), { id: 'leave', label: 'Leave', icon: faUpload, onSelect: vi.fn(), exit: true }];
    render(<RadialMenu open items={items} onClose={vi.fn()} />);
    expect(screen.getByTestId('radial-menu-item-leave').className).toMatch(/itemExit/);
    expect(screen.getByTestId('radial-menu-item-write').className).not.toMatch(/itemExit/);
  });
});
