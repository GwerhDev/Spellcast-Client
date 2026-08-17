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
});
