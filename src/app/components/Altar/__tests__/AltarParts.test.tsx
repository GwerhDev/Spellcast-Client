import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { AltarBrandIcon, AltarCornerButton, AltarHint, AltarNowReading, AltarWave } from '../AltarParts';

describe('Altar parts', () => {
  it('AltarCornerButton fires its action, and marks the danger variant', () => {
    const onClick = vi.fn();
    render(<AltarCornerButton data-testid="corner" icon={faTrash} title="Delete" danger onClick={onClick} />);
    fireEvent.click(screen.getByTestId('corner'));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByTestId('corner').className).toMatch(/cornerDanger/);
  });

  it('AltarNowReading shows the status, the page when known, and the title', () => {
    const { rerender } = render(<AltarNowReading status="Paused" page="Page 2 of 9" title="Spell one" />);
    expect(screen.getByTestId('altar-now')).toHaveTextContent('Paused');
    expect(screen.getByTestId('altar-now')).toHaveTextContent('Page 2 of 9');
    expect(screen.getByTestId('altar-title')).toHaveTextContent('Spell one');
    rerender(<AltarNowReading status="Paused" title="Spell one" />);
    expect(screen.getByTestId('altar-now')).not.toHaveTextContent('Page');
  });

  it('AltarHint shows its text, and steps aside when hidden', () => {
    const { rerender } = render(<AltarHint text="Drop it here" />);
    expect(screen.getByTestId('altar-hint')).toHaveTextContent('Drop it here');
    expect(screen.getByTestId('altar-hint')).not.toHaveAttribute('aria-hidden');
    rerender(<AltarHint text="Drop it here" hidden />);
    expect(screen.getByTestId('altar-hint')).toHaveAttribute('aria-hidden', 'true');
  });

  it('AltarWave animates only while active', () => {
    const { rerender } = render(<AltarWave active={false} />);
    const wave = () => screen.getByTestId('altar-wave').querySelector('[data-testid="waveform"]')!;
    expect(wave().className).toMatch(/idle/);
    rerender(<AltarWave active />);
    expect(wave().className).toMatch(/active/);
  });

  it('AltarBrandIcon draws the mark as a mask', () => {
    render(<AltarBrandIcon />);
    expect(screen.getByTestId('altar-brand-icon').style.maskImage).toContain('url(');
  });
});
