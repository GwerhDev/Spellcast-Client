import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VersionSelector } from '../VersionSelector';

const labels = { title: 'Version', newVersion: 'New version…', fuse: 'Fuse into "source"…' };
const renderSelector = (over = {}) => {
  const props = { current: 'source', versions: ['source', 'draft'], onSwitch: vi.fn(), onNew: vi.fn(), onFuse: vi.fn(), labels, ...over };
  render(<VersionSelector {...props} />);
  return props;
};

describe('VersionSelector', () => {
  it('is disabled while the versions are read', () => {
    renderSelector({ current: null });
    const trigger = screen.getByTestId('version-selector');
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute('aria-busy', 'true');
    expect(trigger.textContent).toContain('Version');
  });

  it('shows the current version and opens the list on click', () => {
    renderSelector();
    expect(screen.getByTestId('version-selector').textContent).toContain('source');
    expect(screen.queryByTestId('version-option-draft')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('version-selector'));
    expect(screen.getByTestId('version-option-source')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('version-option-draft')).toHaveAttribute('aria-checked', 'false');
  });

  it('picking another version switches to it and closes; the current one does nothing', () => {
    const props = renderSelector();
    fireEvent.click(screen.getByTestId('version-selector'));
    fireEvent.click(screen.getByTestId('version-option-source'));
    expect(props.onSwitch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('version-selector'));
    fireEvent.click(screen.getByTestId('version-option-draft'));
    expect(props.onSwitch).toHaveBeenCalledWith('draft');
    expect(screen.queryByTestId('version-option-draft')).not.toBeInTheDocument();
  });

  it('offers a new version', () => {
    const props = renderSelector();
    fireEvent.click(screen.getByTestId('version-selector'));
    fireEvent.click(screen.getByTestId('version-new'));
    expect(props.onNew).toHaveBeenCalled();
  });

  it('closes on Escape and on a click outside', () => {
    renderSelector();
    fireEvent.click(screen.getByTestId('version-selector'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('version-new')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('version-selector'));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('version-new')).not.toBeInTheDocument();
  });

  it('fusing another version is offered only while there is another one', () => {
    const props = renderSelector();
    fireEvent.click(screen.getByTestId('version-selector'));
    fireEvent.click(screen.getByTestId('version-fuse'));
    expect(props.onFuse).toHaveBeenCalled();
    expect(screen.queryByTestId('version-fuse')).not.toBeInTheDocument();

    renderSelector({ versions: ['source'] });
    fireEvent.click(screen.getAllByTestId('version-selector')[1]);
    expect(screen.getByTestId('version-fuse')).toBeDisabled();
  });
});
