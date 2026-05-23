import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { SoundBackground } from '../index';

describe('SoundBackground', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<SoundBackground />);
    expect(container).toBeInTheDocument();
  });
});
