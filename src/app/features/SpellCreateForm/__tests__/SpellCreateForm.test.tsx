import { describe, it, expect, vi, beforeAll } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { SpellCreateForm } from '../index';

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: '' },
}));

vi.mock('pdfjs-dist/build/pdf.worker?url', () => ({ default: '' }));

vi.mock('../../../../app/components/Editors/SpellEditor', () => ({
  SpellEditor: () => null,
}));

beforeAll(() => {
  Element.prototype.scrollTo = vi.fn();
});

describe('SpellCreateForm', () => {
  it('renders the form container', () => {
    renderWithProviders(<SpellCreateForm />);
    expect(screen.getByTestId('spell-create-form')).toBeInTheDocument();
  });

  it('renders the title input', () => {
    renderWithProviders(<SpellCreateForm />);
    expect(screen.getByTestId('spell-title-input')).toBeInTheDocument();
  });
});
