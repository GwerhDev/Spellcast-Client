import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { PdfProcessor } from '../index';

vi.mock('../../../../db', () => ({
  getSpellById: vi.fn().mockResolvedValue(null),
  updateSpellProgress: vi.fn(),
}));

vi.mock('../../../../utils/pdfUtils', () => ({
  injectCoverIntoPages: vi.fn(async (pages) => pages),
}));

describe('PdfProcessor', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<PdfProcessor />);
    expect(container).toBeInTheDocument();
  });
});
