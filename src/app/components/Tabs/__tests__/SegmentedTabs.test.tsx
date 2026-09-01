import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { faPen, faUpload } from '@fortawesome/free-solid-svg-icons';
import { SegmentedTabs } from '../SegmentedTabs';

const tabs = [
  { id: 'text', label: 'Text', icon: faPen },
  { id: 'import', label: 'Import', icon: faUpload },
];

describe('SegmentedTabs', () => {
  it('renders every tab', () => {
    render(<SegmentedTabs tabs={tabs} active="text" onChange={vi.fn()} />);
    expect(screen.getByTestId('segmented-tab-text')).toBeInTheDocument();
    expect(screen.getByTestId('segmented-tab-import')).toBeInTheDocument();
  });

  it('marks the active tab', () => {
    render(<SegmentedTabs tabs={tabs} active="import" onChange={vi.fn()} />);
    expect(screen.getByTestId('segmented-tab-import').className).toMatch(/active/);
    expect(screen.getByTestId('segmented-tab-text').className).not.toMatch(/active/);
  });

  it('calls onChange with the clicked tab id', () => {
    const onChange = vi.fn();
    render(<SegmentedTabs tabs={tabs} active="text" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('segmented-tab-import'));
    expect(onChange).toHaveBeenCalledWith('import');
  });

  it('assigns left/middle/right position classes across more than two tabs', () => {
    const threeTabs = [...tabs, { id: 'extra', label: 'Extra' }];
    render(<SegmentedTabs tabs={threeTabs} active="text" onChange={vi.fn()} />);
    expect(screen.getByTestId('segmented-tab-text').className).toMatch(/left/);
    expect(screen.getByTestId('segmented-tab-import').className).toMatch(/middle/);
    expect(screen.getByTestId('segmented-tab-extra').className).toMatch(/right/);
  });

  // jsdom never lays out real box sizes (scrollWidth/clientWidth default to 0), which
  // conveniently means "no overflow" for every test above -- these two stub the scroll
  // container's box directly to exercise the slider behavior that only kicks in once the
  // tab strip actually overflows its container (e.g. many tabs on a narrow viewport).
  it('does not show scroll arrows when the tab strip fits its container', () => {
    render(<SegmentedTabs tabs={tabs} active="text" onChange={vi.fn()} />);
    expect(screen.queryByTestId('segmented-tabs-arrow-left')).not.toBeInTheDocument();
    expect(screen.queryByTestId('segmented-tabs-arrow-right')).not.toBeInTheDocument();
  });

  it('shows scroll arrows once the tab strip overflows, disabled at the matching edge, and scrolls on click', () => {
    const manyTabs = Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, label: `Tab ${i}` }));
    render(<SegmentedTabs tabs={manyTabs} active="t0" onChange={vi.fn()} />);
    const containerEl = screen.getByTestId('segmented-tabs-container');
    const scrollEl = screen.getByTestId('segmented-tabs-scroll');
    // Overflow is measured against the OUTER container's clientWidth, not the scroll
    // strip's own -- see the comment on updateOverflow for why (the strip's clientWidth
    // shifts once arrows appear/disappear, which fed back into itself and made the whole
    // bar flicker on every resize tick).
    Object.defineProperty(containerEl, 'clientWidth', { value: 300, configurable: true });
    Object.defineProperty(scrollEl, 'scrollWidth', { value: 1200, configurable: true });
    Object.defineProperty(scrollEl, 'clientWidth', { value: 300, configurable: true });
    Object.defineProperty(scrollEl, 'scrollLeft', { value: 0, configurable: true, writable: true });
    const scrollBySpy = vi.fn();
    scrollEl.scrollBy = scrollBySpy;
    fireEvent.scroll(scrollEl);

    expect(screen.getByTestId('segmented-tabs-arrow-left')).toBeDisabled();
    expect(screen.getByTestId('segmented-tabs-arrow-right')).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('segmented-tabs-arrow-right'));
    expect(scrollBySpy).toHaveBeenCalledWith(expect.objectContaining({ left: expect.any(Number), behavior: 'smooth' }));

    Object.defineProperty(scrollEl, 'scrollLeft', { value: 900, configurable: true, writable: true });
    fireEvent.scroll(scrollEl);
    expect(screen.getByTestId('segmented-tabs-arrow-left')).not.toBeDisabled();
    expect(screen.getByTestId('segmented-tabs-arrow-right')).toBeDisabled();
  });

  it('bases the overflow decision on the outer container, not the scroll strip\'s own (shrinkable) width', () => {
    // Regression test: previously, overflow was measured against the scroll strip's own
    // clientWidth -- but that width itself shrinks by ~64px the moment the arrows appear
    // (they take that space out of the same row), which fed back into the very check
    // deciding whether to show them, and could flip it back and forth on every resize tick
    // ("salta como loco" while resizing). Proven directly here: the scroll strip's own
    // clientWidth is set to a value that would flip the decision if it were still being
    // read, while the outer container's clientWidth (the actual, stable source now) says
    // the opposite -- the outer container must be what wins.
    const manyTabs = Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, label: `Tab ${i}` }));
    render(<SegmentedTabs tabs={manyTabs} active="t0" onChange={vi.fn()} />);
    const containerEl = screen.getByTestId('segmented-tabs-container');
    const scrollEl = screen.getByTestId('segmented-tabs-scroll');
    Object.defineProperty(scrollEl, 'scrollWidth', { value: 500, configurable: true });

    // Container says "plenty of room" (500 content vs 900 available) -- scroll strip's own
    // width says the opposite (500 vs 200). If the strip's width still drove the decision,
    // arrows would incorrectly appear here.
    Object.defineProperty(containerEl, 'clientWidth', { value: 900, configurable: true });
    Object.defineProperty(scrollEl, 'clientWidth', { value: 200, configurable: true });
    fireEvent.scroll(scrollEl);
    expect(screen.queryByTestId('segmented-tabs-arrow-left')).not.toBeInTheDocument();

    // And the reverse: container says "too tight" (500 vs 200) even though the scroll
    // strip's own width claims plenty of room (500 vs 900) -- arrows must still appear.
    Object.defineProperty(containerEl, 'clientWidth', { value: 200, configurable: true });
    Object.defineProperty(scrollEl, 'clientWidth', { value: 900, configurable: true });
    fireEvent.scroll(scrollEl);
    expect(screen.getByTestId('segmented-tabs-arrow-left')).toBeInTheDocument();
  });
});
