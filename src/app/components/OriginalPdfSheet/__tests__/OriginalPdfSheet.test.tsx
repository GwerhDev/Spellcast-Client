import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { OriginalPdfSheet } from '../index';
import type { OriginalPdf } from '../../../../hooks/useOriginalPdf';

const ready = (numPages: number): OriginalPdf => ({
  status: 'ready',
  pdf: { numPages, getPage: vi.fn(() => new Promise(() => {})), destroy: vi.fn() } as never,
});

describe('OriginalPdfSheet', () => {
  it('draws the PDF page of the same number, as wide as the spell page at its zoom', () => {
    renderWithProviders(<OriginalPdfSheet original={ready(3)} pageNumber={2} width={800} height={1131} zoom={0.5} />);
    expect(screen.getByTestId('original-pdf-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('original-pdf-sheet')).toHaveStyle({ width: '400px' });
  });

  it('says so when the PDF has no page with that number', () => {
    renderWithProviders(<OriginalPdfSheet original={ready(3)} pageNumber={5} width={800} height={1131} zoom={1} />);
    expect(screen.queryByTestId('original-pdf-canvas')).toBeNull();
    expect(screen.getByTestId('original-pdf-status')).toBeInTheDocument();
  });

  it('says so when the PDF could not be opened', () => {
    renderWithProviders(<OriginalPdfSheet original={{ status: 'error' }} pageNumber={1} width={800} height={1131} zoom={1} />);
    expect(screen.getByTestId('original-pdf-status')).toBeInTheDocument();
  });
});
