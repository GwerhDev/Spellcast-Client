import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { InventoryBag, type BagItem } from '../InventoryBag';
import { soundBackgrounds, pageBackgrounds } from '../../../../config/assets';

const items: BagItem[] = [
  { asset: soundBackgrounds[0], isActive: false },
  { asset: pageBackgrounds[0], isActive: true },
];

describe('InventoryBag', () => {
  it('renders one slot per item and pads the bag with empty slots', () => {
    renderWithProviders(<InventoryBag items={items} onSelect={vi.fn()} />);
    expect(screen.getByTestId(`bag-slot-${soundBackgrounds[0].id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`bag-slot-${pageBackgrounds[0].id}`)).toBeInTheDocument();
    expect(screen.getAllByTestId('bag-slot-empty').length).toBeGreaterThan(0);
  });

  it('fills whole rows (item + empty slots is a multiple of the column count)', () => {
    renderWithProviders(<InventoryBag items={items} onSelect={vi.fn()} />);
    const total = items.length + screen.getAllByTestId('bag-slot-empty').length;
    expect(total % 8).toBe(0);
  });

  it('marks only the active item', () => {
    renderWithProviders(<InventoryBag items={items} onSelect={vi.fn()} />);
    expect(screen.getByTestId(`bag-slot-active-${pageBackgrounds[0].id}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`bag-slot-active-${soundBackgrounds[0].id}`)).not.toBeInTheDocument();
  });

  it('shows the popover on hover and hides it on leave', () => {
    renderWithProviders(<InventoryBag items={items} onSelect={vi.fn()} />);
    const slot = screen.getByTestId(`bag-slot-${soundBackgrounds[0].id}`);
    fireEvent.mouseEnter(slot);
    expect(screen.getByTestId('bag-popover')).toHaveTextContent(soundBackgrounds[0].name);
    fireEvent.mouseLeave(slot);
    expect(screen.queryByTestId('bag-popover')).not.toBeInTheDocument();
  });

  it('shows the popover on keyboard focus too', () => {
    renderWithProviders(<InventoryBag items={items} onSelect={vi.fn()} />);
    fireEvent.focus(screen.getByTestId(`bag-slot-${pageBackgrounds[0].id}`));
    expect(screen.getByTestId('bag-popover')).toHaveTextContent(pageBackgrounds[0].name);
  });

  it('calls onSelect with the asset on click and closes the popover', () => {
    const onSelect = vi.fn();
    renderWithProviders(<InventoryBag items={items} onSelect={onSelect} />);
    const slot = screen.getByTestId(`bag-slot-${soundBackgrounds[0].id}`);
    fireEvent.mouseEnter(slot);
    fireEvent.click(slot);
    expect(onSelect).toHaveBeenCalledWith(soundBackgrounds[0]);
    expect(screen.queryByTestId('bag-popover')).not.toBeInTheDocument();
  });
});
