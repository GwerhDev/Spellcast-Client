import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { EditorLanding } from '../index';

describe('EditorLanding', () => {
  it('renders editor landing', () => {
    renderWithProviders(<EditorLanding />);
    expect(screen.getByTestId('editor-landing')).toBeInTheDocument();
  });

  it('shows create and edit cards', () => {
    renderWithProviders(<EditorLanding />);
    expect(screen.getByTestId('editor-create-card')).toBeInTheDocument();
    expect(screen.getByTestId('editor-edit-card')).toBeInTheDocument();
  });

  it('clicking edit card does not throw', () => {
    renderWithProviders(<EditorLanding />, { initialPath: '/editor' });
    expect(() => fireEvent.click(screen.getByTestId('editor-edit-card'))).not.toThrow();
  });
});
