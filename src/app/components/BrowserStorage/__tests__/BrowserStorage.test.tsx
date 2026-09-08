import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { LanguageProvider } from '../../../../i18n';
import { BrowserStorage } from '../BrowserStorage';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.indexedDB = new IDBFactory();
  Object.defineProperty(navigator, 'storage', {
    value: { estimate: vi.fn().mockResolvedValue({ usage: 1024, quota: 1024 * 1024, usageDetails: {} }) },
    configurable: true,
  });
});

const renderBrowserStorage = () => render(<LanguageProvider><BrowserStorage /></LanguageProvider>);

// TCORE-118/119: audio cache and spells both live under Local (they're IndexedDB, part of
// local storage), not their own top-level Storage categories -- reachable here as
// drill-downs from the counts this component already showed, not from StorageOverview.
describe('BrowserStorage drill-downs', () => {
  it('renders the audio cache detail as a clickable card that navigates to its nested settings route', async () => {
    renderBrowserStorage();

    const link = await screen.findByTestId('storage-detail-audio-cache');
    link.click();

    expect(navigateMock).toHaveBeenCalledWith('/caster/settings/storage/local/audio-cache');
  });

  it('renders the spells detail as a clickable card that navigates to its nested settings route', async () => {
    renderBrowserStorage();

    const link = await screen.findByTestId('storage-detail-spells');
    link.click();

    expect(navigateMock).toHaveBeenCalledWith('/caster/settings/storage/local/spells');
  });

  it('keeps the other storage-detail counts as plain, non-navigable info', async () => {
    renderBrowserStorage();
    await screen.findByTestId('storage-detail-audio-cache');

    // Only spells/audio cache are buttons; voiceProfile/appSettings stay plain divs.
    const allDetailValues = screen.getAllByText(/^(—|\d+)$/);
    const buttons = allDetailValues.filter((el) => el.closest('button'));
    expect(buttons).toHaveLength(2);
  });
});
