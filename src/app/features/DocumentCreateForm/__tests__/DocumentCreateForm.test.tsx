import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { DocumentCreateForm } from '../index';

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: '' },
}));

vi.mock('pdfjs-dist/build/pdf.worker?url', () => ({ default: '' }));

vi.mock('../../../../app/components/Editors/DocumentEditor', () => ({
  DocumentEditor: () => null,
}));

describe('DocumentCreateForm', () => {
  it('renders the form container', () => {
    renderWithProviders(<DocumentCreateForm />);
    expect(screen.getByTestId('document-create-form')).toBeInTheDocument();
  });

  it('renders the title input', () => {
    renderWithProviders(<DocumentCreateForm />);
    expect(screen.getByPlaceholderText(/title/i)).toBeInTheDocument();
  });
});
