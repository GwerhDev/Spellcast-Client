import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlassProvider, useGlass } from '../GlassContext';

const Toggle = () => {
  const { enabled, setEnabled } = useGlass();
  return <button data-testid="glass-toggle" data-on={enabled || undefined} onClick={() => setEnabled(!enabled)} />;
};

describe('GlassContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-glass');
  });

  it('is on by default: the glass surfaces take it', () => {
    render(<GlassProvider><Toggle /></GlassProvider>);
    expect(screen.getByTestId('glass-toggle')).toHaveAttribute('data-on');
    expect(document.documentElement).toHaveAttribute('data-glass');
  });

  it('turned off and on again, unmarks and marks the page, and keeps the choice', () => {
    render(<GlassProvider><Toggle /></GlassProvider>);
    fireEvent.click(screen.getByTestId('glass-toggle'));
    expect(document.documentElement).not.toHaveAttribute('data-glass');
    expect(localStorage.getItem('glass')).toBe('0');
    fireEvent.click(screen.getByTestId('glass-toggle'));
    expect(document.documentElement).toHaveAttribute('data-glass');
    expect(localStorage.getItem('glass')).toBe('1');
  });

  it('starts as it was left: off once turned off', () => {
    localStorage.setItem('glass', '0');
    render(<GlassProvider><Toggle /></GlassProvider>);
    expect(screen.getByTestId('glass-toggle')).not.toHaveAttribute('data-on');
    expect(document.documentElement).not.toHaveAttribute('data-glass');
  });
});
