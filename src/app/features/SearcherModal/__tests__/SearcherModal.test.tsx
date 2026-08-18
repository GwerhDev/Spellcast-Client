import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { SearcherModal } from '../index';

vi.mock('../../../../db', () => ({
  getSpellById: vi.fn().mockResolvedValue(null),
}));

describe('SearcherModal', () => {
  it('renders nothing when showSearcher is false', () => {
    const { container } = renderWithProviders(<SearcherModal />);
    expect(container.firstChild).toBeNull();
  });
});
