import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { SpellProcessor } from '../index';

vi.mock('../../../../db', () => ({
  getSpellById: vi.fn().mockResolvedValue(null),
  updateSpellProgress: vi.fn(),
}));

vi.mock('../../../../utils/pdfUtils', () => ({
  injectCoverIntoPages: vi.fn(async (pages) => pages),
}));

describe('SpellProcessor', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<SpellProcessor />);
    expect(container).toBeInTheDocument();
  });
});
