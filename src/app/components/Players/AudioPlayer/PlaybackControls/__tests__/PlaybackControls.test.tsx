import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaybackControls } from '../PlaybackControls';

const baseProps = {
  audioRef: { current: null },
  currentTime: 0,
  duration: 100,
  progressPercentage: 0,
  handlePrevious: vi.fn(),
  handleNext: vi.fn(),
  disabled: false,
  isPlaying: false,
  isPrevDisabled: false,
  isNextDisabled: false,
  currentTrackIndex: 0,
  formatTime: (t: number) => `${t}s`,
  togglePlayPause: vi.fn(),
  setCurrentTime: vi.fn(),
};

// Guards the Phase 3b migration of the prev/next controls from raw <button> to IconButton.
describe('PlaybackControls', () => {
  it('fires handlePrevious/handleNext when the migrated IconButton controls are clicked', () => {
    const handlePrevious = vi.fn();
    const handleNext = vi.fn();
    render(<PlaybackControls {...baseProps} handlePrevious={handlePrevious} handleNext={handleNext} />);

    fireEvent.click(screen.getByTestId('playback-previous-btn'));
    fireEvent.click(screen.getByTestId('playback-next-btn'));

    expect(handlePrevious).toHaveBeenCalledTimes(1);
    expect(handleNext).toHaveBeenCalledTimes(1);
  });

  it('disables the prev/next controls when isPrevDisabled/isNextDisabled are set', () => {
    render(<PlaybackControls {...baseProps} isPrevDisabled isNextDisabled />);
    expect(screen.getByTestId('playback-previous-btn')).toBeDisabled();
    expect(screen.getByTestId('playback-next-btn')).toBeDisabled();
  });

  it("disables play while the current page's audio is being fetched, and enables it once it's there", () => {
    const togglePlayPause = vi.fn();
    const { rerender } = render(<PlaybackControls {...baseProps} togglePlayPause={togglePlayPause} isFetching />);
    expect(screen.getByTestId('play-button')).toBeDisabled();
    fireEvent.click(screen.getByTestId('play-button'));
    expect(togglePlayPause).not.toHaveBeenCalled();

    rerender(<PlaybackControls {...baseProps} togglePlayPause={togglePlayPause} isFetching={false} />);
    expect(screen.getByTestId('play-button')).toBeEnabled();
    fireEvent.click(screen.getByTestId('play-button'));
    expect(togglePlayPause).toHaveBeenCalledTimes(1);
  });
});
