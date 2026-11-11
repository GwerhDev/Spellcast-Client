import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Carousel } from '../Carousel';

// The test DOM lays nothing out: the row's sizes are set by hand.
const size = (el: HTMLElement, { scrollWidth, clientWidth, scrollLeft }: { scrollWidth: number; clientWidth: number; scrollLeft: number }) => {
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
  el.scrollLeft = scrollLeft;
  fireEvent.scroll(el);
};

describe('Carousel', () => {
  it('holds its items, each as wide as it says', () => {
    render(<Carousel previousLabel="Previous" nextLabel="Next" itemWidth="168px" data-testid="row"><div data-testid="item-a" /><div data-testid="item-b" /></Carousel>);
    expect(screen.getByTestId('row')).toHaveStyle({ '--item-width': '168px' });
    expect(screen.getByTestId('item-a')).toBeInTheDocument();
  });

  it('fades only the edges with more to see: its end at rest, both midway, its start at the end', () => {
    render(<Carousel previousLabel="Previous" nextLabel="Next" itemWidth="100px" data-testid="row"><div /><div /><div /></Carousel>);
    const row = screen.getByTestId('row');
    size(row, { scrollWidth: 600, clientWidth: 300, scrollLeft: 0 });
    expect(row).not.toHaveAttribute('data-more-before');
    expect(row).toHaveAttribute('data-more-after');
    size(row, { scrollWidth: 600, clientWidth: 300, scrollLeft: 150 });
    expect(row).toHaveAttribute('data-more-before');
    expect(row).toHaveAttribute('data-more-after');
    size(row, { scrollWidth: 600, clientWidth: 300, scrollLeft: 300 });
    expect(row).toHaveAttribute('data-more-before');
    expect(row).not.toHaveAttribute('data-more-after');
  });

  it("doesn't fade at all when it all fits", () => {
    render(<Carousel previousLabel="Previous" nextLabel="Next" itemWidth="100px" data-testid="row"><div /></Carousel>);
    const row = screen.getByTestId('row');
    size(row, { scrollWidth: 300, clientWidth: 300, scrollLeft: 0 });
    expect(row).not.toHaveAttribute('data-more-before');
    expect(row).not.toHaveAttribute('data-more-after');
  });

  it('has a button for each side with more to see, scrolling it by most of its width', () => {
    render(<Carousel previousLabel="Previous" nextLabel="Next" itemWidth="100px" data-testid="row"><div /><div /><div /></Carousel>);
    const row = screen.getByTestId('row');
    const scrollBy = vi.fn();
    row.scrollBy = scrollBy as unknown as typeof row.scrollBy;
    size(row, { scrollWidth: 600, clientWidth: 300, scrollLeft: 0 });
    expect(screen.queryByTestId('row-previous')).toBeNull();
    fireEvent.click(screen.getByTestId('row-next'));
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 240 }));
    size(row, { scrollWidth: 600, clientWidth: 300, scrollLeft: 300 });
    expect(screen.queryByTestId('row-next')).toBeNull();
    fireEvent.click(screen.getByTestId('row-previous'));
    expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: -240 }));
    expect(screen.getByTestId('row-previous')).toHaveAttribute('aria-label', 'Previous');
  });
});
