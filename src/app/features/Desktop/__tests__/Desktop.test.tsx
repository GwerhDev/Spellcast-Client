import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { Desktop } from '../index';
import type { EnvCategory } from '../../../../services/apps';

const getNhexaEnvMock = vi.fn();
vi.mock('services/apps', () => ({
  getNhexaEnv: (...args: unknown[]) => getNhexaEnvMock(...args),
}));

const originalLocation = window.location;
const setLocation = (host: string) => {
  Object.defineProperty(window, 'location', { writable: true, configurable: true, value: { host, href: `http://${host}/` } });
};

beforeEach(() => {
  vi.clearAllMocks();
  setLocation('spellcast.example.com');
});
afterEach(() => {
  Object.defineProperty(window, 'location', { writable: true, configurable: true, value: originalLocation });
});

const category = (id: string, name: string, apps: EnvCategory['apps']): EnvCategory => ({ id, name, apps });

describe('Desktop', () => {
  it('shows skeleton placeholders before the app list has loaded', () => {
    getNhexaEnvMock.mockReturnValue(new Promise(() => {})); // never resolves
    renderWithProviders(<Desktop />, { preloadedState: { desktop: { minimized: true } } });

    const launcher = screen.getByTestId('desktop-launcher');
    expect(launcher.querySelectorAll('[class*="skeletonItem"]').length).toBe(4);
  });

  it('renders nothing (launcher hidden) when not minimized', async () => {
    const resolved = Promise.resolve([]);
    getNhexaEnvMock.mockReturnValue(resolved);
    renderWithProviders(<Desktop />, { preloadedState: { desktop: { minimized: false } } });
    await act(async () => { await resolved; });
    expect(screen.queryByTestId('desktop-launcher')).not.toBeInTheDocument();
  });

  it('renders categories and apps once loaded, marking the same-host app as current', async () => {
    getNhexaEnvMock.mockResolvedValue([
      category('nhexa', 'Nhexa', [
        { label: 'Spellcast', url: 'http://spellcast.example.com/app', icon: 'icon.png' },
        { label: 'Other App', url: 'http://other.example.com/app', icon: 'icon2.png' },
      ]),
    ]);
    renderWithProviders(<Desktop />, { preloadedState: { desktop: { minimized: true } } });

    await waitFor(() => expect(screen.getByTestId('desktop-app-current')).toBeInTheDocument());
    expect(screen.getByTestId('desktop-app-current')).toHaveTextContent('SPELLCAST');
    expect(screen.getByTestId('desktop-app-other')).toHaveTextContent('OTHER APP');
  });

  it('falls back to a URL/label match for "spellcast" when no app shares this host', async () => {
    setLocation('some-unrelated-host.example.com');
    getNhexaEnvMock.mockResolvedValue([
      category('nhexa', 'Nhexa', [
        { label: 'Spellcast Reader', url: 'http://spellcast.example.com/app', icon: 'icon.png' },
        { label: 'Other App', url: 'http://other.example.com/app', icon: 'icon2.png' },
      ]),
    ]);
    renderWithProviders(<Desktop />, { preloadedState: { desktop: { minimized: true } } });

    await waitFor(() => expect(screen.getByTestId('desktop-app-current')).toBeInTheDocument());
    expect(screen.getByTestId('desktop-app-current')).toHaveTextContent('SPELLCAST READER');
  });

  it('clicking the current app un-minimizes the desktop instead of navigating', async () => {
    getNhexaEnvMock.mockResolvedValue([
      category('nhexa', 'Nhexa', [
        { label: 'Spellcast', url: 'http://spellcast.example.com/app', icon: 'icon.png' },
      ]),
    ]);
    const { store } = renderWithProviders(<Desktop />, { preloadedState: { desktop: { minimized: true } } });

    await waitFor(() => expect(screen.getByTestId('desktop-app-current')).toBeInTheDocument());
    const hrefBefore = window.location.href;
    fireEvent.click(screen.getByTestId('desktop-app-current'));

    expect(store.getState().desktop.minimized).toBe(false);
    expect(window.location.href).toBe(hrefBefore); // never navigated away
  });

  it('clicking a different app navigates to its url instead of dispatching', async () => {
    getNhexaEnvMock.mockResolvedValue([
      category('nhexa', 'Nhexa', [
        { label: 'Spellcast', url: 'http://spellcast.example.com/app', icon: 'icon.png' },
        { label: 'Other App', url: 'http://other.example.com/app', icon: 'icon2.png' },
      ]),
    ]);
    const { store } = renderWithProviders(<Desktop />, { preloadedState: { desktop: { minimized: true } } });

    await waitFor(() => expect(screen.getByTestId('desktop-app-other')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('desktop-app-other'));

    expect(window.location.href).toBe('http://other.example.com/app');
    expect(store.getState().desktop.minimized).toBe(true); // unchanged
  });

  it('swallows a failed app-list fetch and keeps showing the skeleton, without crashing', async () => {
    getNhexaEnvMock.mockRejectedValue(new Error('network down'));
    renderWithProviders(<Desktop />, { preloadedState: { desktop: { minimized: true } } });

    await waitFor(() => expect(getNhexaEnvMock).toHaveBeenCalled());
    expect(screen.getByTestId('desktop-launcher').querySelectorAll('[class*="skeletonItem"]').length).toBe(4);
  });
});
