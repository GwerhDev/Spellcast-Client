import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { GrimoireCharts } from '../index';

vi.mock('../../../../db', () => ({
  getSpellsFromDB: vi.fn().mockResolvedValue([]),
}));

vi.mock('react-chartjs-2', () => ({
  Line: () => null,
}));

describe('GrimoireCharts', () => {
  it('renders the charts container', () => {
    renderWithProviders(<GrimoireCharts />);
    expect(screen.getByTestId('grimoire-charts')).toBeInTheDocument();
  });
});
