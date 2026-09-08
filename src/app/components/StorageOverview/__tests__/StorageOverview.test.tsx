import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../../../../i18n';
import { StorageOverview } from '../StorageOverview';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const getAudioCacheSummaryMock = vi.fn();
vi.mock('../../../../db/audioCache', () => ({
  getAudioCacheSummary: () => getAudioCacheSummaryMock(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  getAudioCacheSummaryMock.mockResolvedValue({ totalBytes: 0, bySpell: {} });
  Object.defineProperty(navigator, 'storage', {
    value: { estimate: vi.fn().mockResolvedValue({ usage: 50, quota: 100 }) },
    configurable: true,
  });
});

const renderOverview = () => render(<LanguageProvider><StorageOverview /></LanguageProvider>);

// TCORE-118: audio cache gets its own card in the Storage overview -- worth a dedicated
// test since this component otherwise has no coverage at all.
describe('StorageOverview audio cache card', () => {
  it('renders a card that navigates to the audio cache settings route', () => {
    renderOverview();
    screen.getByTestId('storage-audio-cache-card').click();
    expect(navigateMock).toHaveBeenCalledWith('/caster/settings/storage/audio-cache');
  });

  it('shows the audio cache size once it resolves', async () => {
    getAudioCacheSummaryMock.mockResolvedValue({ totalBytes: 1536, bySpell: {} });
    renderOverview();

    await waitFor(() => {
      expect(screen.getByTestId('storage-audio-cache-card')).toHaveTextContent('1.5 KB');
    });
  });
});
