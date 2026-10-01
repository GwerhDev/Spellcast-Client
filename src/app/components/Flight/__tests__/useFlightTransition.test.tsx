import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Flight } from '../Flight';
import { useFlightTransition, type FlightOrigin } from '../useFlightTransition';

const Host = ({ show, origin, onClose }: { show: boolean; origin: FlightOrigin | null; onClose: () => void }) => {
  const { slotRef, leg, requestClose, modalMotion, flightProps } = useFlightTransition({ show, origin, onClose });
  if (!show) return null;
  return (
    <>
      <div ref={slotRef} data-testid="slot" data-away={!!leg} data-motion={modalMotion ?? ''} />
      <button data-testid="close" onClick={requestClose} />
      {leg && flightProps && <Flight key={leg.direction} {...flightProps}><span data-testid={`leg-${leg.direction}`} /></Flight>}
    </>
  );
};

const origin = { rect: { top: 10, left: 10, width: 50, height: 50 } };

describe('useFlightTransition', () => {
  it('flies in on open, hiding the slot until it lands', async () => {
    render(<Host show origin={origin} onClose={vi.fn()} />);
    expect(screen.getByTestId('leg-in')).toBeInTheDocument();
    expect(screen.getByTestId('slot')).toHaveAttribute('data-away', 'true');
    await waitFor(() => expect(screen.getByTestId('slot')).toHaveAttribute('data-away', 'false'));
  });

  it('flies back on close and only then closes, fading the modal out', async () => {
    const onClose = vi.fn();
    render(<Host show origin={origin} onClose={onClose} />);
    await waitFor(() => expect(screen.queryByTestId('leg-in')).not.toBeInTheDocument());
    fireEvent.click(screen.getByTestId('close'));
    expect(screen.getByTestId('leg-out')).toBeInTheDocument();
    expect(screen.getByTestId('slot')).toHaveAttribute('data-motion', 'leave');
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('without an origin it neither flies nor animates the modal', () => {
    const onClose = vi.fn();
    render(<Host show origin={null} onClose={onClose} />);
    expect(screen.queryByTestId('leg-in')).not.toBeInTheDocument();
    expect(screen.getByTestId('slot')).toHaveAttribute('data-motion', '');
    fireEvent.click(screen.getByTestId('close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
