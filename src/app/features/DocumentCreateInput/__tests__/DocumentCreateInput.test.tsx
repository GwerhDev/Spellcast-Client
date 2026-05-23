import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { DocumentCreateInput } from '../index';
import { DocumentState } from '../../../../interfaces';

const mockDoc: DocumentState = {
  title: 'Test',
  fileContent: null,
  size: 0,
  totalPages: 0,
  currentPage: 0,
  isLoaded: false,
};

describe('DocumentCreateInput', () => {
  it('renders the input container', () => {
    renderWithProviders(<DocumentCreateInput document={mockDoc} />);
    expect(screen.getByTestId('document-create-input')).toBeInTheDocument();
  });
});
