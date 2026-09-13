import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Mode3DProvider, useMode3D } from '../Mode3DContext';

const STORAGE_KEY = 'mode3d';

// Minimal consumer -- exercises useMode3D through a real provider/DOM instead of asserting
// on internals, same spirit as this project's other context tests.
const Probe = () => {
  const { enabled, setEnabled } = useMode3D();
  return (
    <div>
      <span data-testid="value">{String(enabled)}</span>
      <button onClick={() => setEnabled(!enabled)}>toggle</button>
    </div>
  );
};

const renderProbe = () => render(
  <Mode3DProvider>
    <Probe />
  </Mode3DProvider>
);

beforeEach(() => { localStorage.clear(); });
afterEach(() => { localStorage.clear(); });

describe('Mode3DContext', () => {
  it('defaults to disabled when nothing is persisted', () => {
    renderProbe();
    expect(screen.getByTestId('value')).toHaveTextContent('false');
  });

  it('reads a previously persisted "on" value on mount', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    renderProbe();
    expect(screen.getByTestId('value')).toHaveTextContent('true');
  });

  it('toggling updates the value and persists it', () => {
    renderProbe();
    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('value')).toHaveTextContent('true');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');

    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('value')).toHaveTextContent('false');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('0');
  });

  it('throws when useMode3D is used outside a Mode3DProvider', () => {
    // Swallow React's own console.error for the expected render failure -- matches how
    // this project's other "throws outside provider" hook tests keep output clean.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useMode3D must be used within a Mode3DProvider');
    spy.mockRestore();
  });
});
