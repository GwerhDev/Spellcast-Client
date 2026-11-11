import { describe, expect, it, vi, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AppLaunch, splashOf } from '../AppLaunch';

const stubMotion = (reduce: boolean) => vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
  matches: reduce && query.includes('reduce'), media: query, onchange: null,
  addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
})));

afterEach(() => { vi.unstubAllGlobals(); });

describe('AppLaunch', () => {
  it("knows the splashes it can fade into, by the app's name, and no other", () => {
    expect(splashOf('Spellcast')).toBe('spellcast');
    expect(splashOf('SPECTRA')).toBe('spectra');
    expect(splashOf('StreamBy')).toBe('streamby');
    expect(splashOf('Nhexa')).toBeNull();
  });

  it("draws the app's splash from the logo it publishes, and opens it once its splash covers the screen", () => {
    stubMotion(false);
    const onDone = vi.fn();
    render(<AppLaunch kind="spectra" url="https://spectra.test/home" from={{ x: 10, y: 20 }} onDone={onDone} />);
    const launch = screen.getByTestId('app-launch');
    expect(launch).toHaveAttribute('data-kind', 'spectra');
    expect(launch.querySelector('img')).toHaveAttribute('src', 'https://spectra.test/nhexa-splash.png');
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.transitionEnd(launch, { propertyName: 'clip-path' });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('opens it at once without motion', () => {
    stubMotion(true);
    const onDone = vi.fn();
    render(<AppLaunch kind="streamby" url="https://streamby.test" from={{ x: 0, y: 0 }} onDone={onDone} />);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
