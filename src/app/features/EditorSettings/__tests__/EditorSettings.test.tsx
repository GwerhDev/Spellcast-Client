import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { EditorSettings } from '../index';

describe('EditorSettings', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<EditorSettings />);
    expect(container).toBeInTheDocument();
  });
});
