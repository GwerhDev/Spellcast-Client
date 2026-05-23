import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { ReaderSettings } from '../index';

describe('ReaderSettings', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<ReaderSettings />);
    expect(container).toBeInTheDocument();
  });
});
