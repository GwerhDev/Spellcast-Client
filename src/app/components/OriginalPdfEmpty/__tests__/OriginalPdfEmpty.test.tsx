import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { OriginalPdfEmpty } from '../index';

describe('OriginalPdfEmpty', () => {
  it('offers to import a PDF', () => {
    const onImport = vi.fn();
    renderWithProviders(<OriginalPdfEmpty onImport={onImport} />);
    expect(screen.getByTestId('original-pdf-none')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('original-pdf-import-btn'));
    expect(onImport).toHaveBeenCalled();
  });

  it('can\'t import while busy', () => {
    renderWithProviders(<OriginalPdfEmpty busy onImport={vi.fn()} />);
    expect(screen.getByTestId('original-pdf-import-btn')).toBeDisabled();
  });
});
