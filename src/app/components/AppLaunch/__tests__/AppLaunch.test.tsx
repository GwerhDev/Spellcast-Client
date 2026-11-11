import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { AppLaunch, splashOf } from '../AppLaunch';

const stubMotion = (reduce: boolean) => vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
  matches: reduce && query.includes('reduce'), media: query, onchange: null,
  addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
})));

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('AppLaunch', () => {
  it("knows the splashes it can fade into, by the app's name, and no other", () => {
    expect(splashOf('Spellcast')).toBe('spellcast');
    expect(splashOf('SPECTRA')).toBe('spectra');
    expect(splashOf('StreamBy')).toBe('streamby');
    expect(splashOf('Nhexa')).toBeNull();
  });

  it("draws only the app's splash background, no logo (its own splash draws it), and opens the app once it's all undone", () => {
    vi.useFakeTimers();
    stubMotion(false);
    // Its drawing is the browser's canvas (not this one's): here it only has to open the app in the end.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const onDone = vi.fn();
    render(<AppLaunch kind="spectra" from={{ x: 10, y: 20 }} onDone={onDone} />);
    const launch = screen.getByTestId('app-launch');
    expect(launch).toHaveAttribute('data-kind', 'spectra');
    expect(launch.querySelectorAll('canvas')).toHaveLength(2);
    expect(document.querySelector('[data-testid="app-launch"] img, img[src*="nhexa-splash"]')).toBeNull();
    expect(onDone).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('opens it at once without motion', () => {
    stubMotion(true);
    const onDone = vi.fn();
    render(<AppLaunch kind="streamby" from={{ x: 0, y: 0 }} onDone={onDone} />);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
