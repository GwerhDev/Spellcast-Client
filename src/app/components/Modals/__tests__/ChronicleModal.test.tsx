import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { ChronicleModal } from '../ChronicleModal';

describe('ChronicleModal', () => {
  it('lists the seals given, in order', () => {
    renderWithProviders(<ChronicleModal show title="Chronicle" onClose={vi.fn()} items={[
      { id: 'b', date: 'Oct 19, 18:40', summary: '2 pages changed' },
      { id: 'a', date: 'Oct 19, 17:00', summary: 'First seal' },
    ]} />);
    const items = screen.getAllByTestId('chronicle-item');
    expect(items.map(item => item.textContent)).toEqual(['Oct 19, 18:402 pages changed', 'Oct 19, 17:00First seal']);
  });

  it('shows it is reading while there are no items yet', () => {
    renderWithProviders(<ChronicleModal show title="Chronicle" onClose={vi.fn()} items={null} />);
    expect(screen.queryByTestId('chronicle-list')).not.toBeInTheDocument();
  });
});
