import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../../test/renderWithProviders';
import { PlaybackControls } from '../index';

const baseProps = {
  handlePrevious: vi.fn(),
  handleNext: vi.fn(),
  disabled: false,
  isPrevDisabled: false,
  isNextDisabled: false,
  handleTogglePlayPause: vi.fn(),
};

// Guards the Phase 3b migration of the prev/next controls from raw <button> to IconButton.
describe('BrowserPlayer PlaybackControls', () => {
  it('fires handlePrevious/handleNext when the migrated IconButton controls are clicked', () => {
    const handlePrevious = vi.fn();
    const handleNext = vi.fn();
    renderWithProviders(<PlaybackControls {...baseProps} handlePrevious={handlePrevious} handleNext={handleNext} />);

    fireEvent.click(screen.getByTestId('playback-previous-btn'));
    fireEvent.click(screen.getByTestId('playback-next-btn'));

    expect(handlePrevious).toHaveBeenCalledTimes(1);
    expect(handleNext).toHaveBeenCalledTimes(1);
  });

  it('disables the prev/next controls when isPrevDisabled/isNextDisabled are set', () => {
    renderWithProviders(<PlaybackControls {...baseProps} isPrevDisabled isNextDisabled />);
    expect(screen.getByTestId('playback-previous-btn')).toBeDisabled();
    expect(screen.getByTestId('playback-next-btn')).toBeDisabled();
  });
});
