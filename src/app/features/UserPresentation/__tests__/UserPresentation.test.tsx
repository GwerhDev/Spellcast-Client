import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { UserPresentation } from '../index';

vi.mock('../../../components/LibraryCharts/LibraryCharts', () => ({
  LibraryCharts: () => null,
}));

vi.mock('../../../components/UserStats/UserStats', () => ({
  UserStats: () => null,
}));

vi.mock('../../../components/StorageOverview/StorageOverview', () => ({
  StorageOverview: () => null,
}));

describe('UserPresentation', () => {
  it('renders the user presentation container', () => {
    renderWithProviders(<UserPresentation />);
    expect(screen.getByTestId('user-presentation')).toBeInTheDocument();
  });
});
