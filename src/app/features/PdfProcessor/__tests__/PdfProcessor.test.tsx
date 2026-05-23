import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { PdfProcessor } from '../index';

vi.mock('../../../../db', () => ({
  getDocumentById: vi.fn().mockResolvedValue(null),
  updateDocumentProgress: vi.fn(),
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
