import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { LibraryCharts } from '../index';

vi.mock('../../../../db', () => ({
  getDocumentsFromDB: vi.fn().mockResolvedValue([]),
}));

vi.mock('react-chartjs-2', () => ({
  Line: () => null,
}));

describe('LibraryCharts', () => {
  it('renders the charts container', () => {
    renderWithProviders(<LibraryCharts />);
    expect(screen.getByTestId('library-charts')).toBeInTheDocument();
  });
});
