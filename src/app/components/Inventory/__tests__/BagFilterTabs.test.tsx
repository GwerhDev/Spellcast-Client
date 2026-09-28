import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { faLayerGroup, faMusic } from '@fortawesome/free-solid-svg-icons';
import { BagFilterTabs } from '../BagFilterTabs';

const tabs = [
  { id: 'all', label: 'All', icon: faLayerGroup },
  { id: 'sound-background', label: 'Sounds', icon: faMusic },
];

describe('BagFilterTabs', () => {
  it('renders one tab per filter and marks the active one', () => {
    render(<BagFilterTabs tabs={tabs} active="all" onChange={vi.fn()} />);
    expect(screen.getByTestId('bag-filter-all')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('bag-filter-sound-background')).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with the clicked tab id', () => {
    const onChange = vi.fn();
    render(<BagFilterTabs tabs={tabs} active="all" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('bag-filter-sound-background'));
    expect(onChange).toHaveBeenCalledWith('sound-background');
  });
});
