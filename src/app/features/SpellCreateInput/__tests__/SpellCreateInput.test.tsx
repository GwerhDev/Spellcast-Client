import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { SpellCreateInput } from '../index';
import { setSession } from '../../../../store/sessionSlice';
import { SpellState } from '../../../../interfaces';

const mockDoc: SpellState = {
  title: 'Test',
  fileContent: null,
  size: 0,
  totalPages: 0,
  currentPage: 0,
  isLoaded: false,
};

describe('SpellCreateInput', () => {
  it('renders the input container', () => {
    renderWithProviders(<SpellCreateInput spell={mockDoc} />);
    expect(screen.getByTestId('spell-create-input')).toBeInTheDocument();
  });

  // The title comes from the file; it's renamed afterwards, from the spell itself.
  it('shows the title read-only', () => {
    renderWithProviders(<SpellCreateInput spell={mockDoc} />);
    const title = screen.getByTestId('spell-create-input-title');
    expect(title).toHaveAttribute('readonly');
    expect(title).toHaveValue('Test');
  });

  it('enqueues the file with its title, leaving the worker free to prefer the PDF\'s own', () => {
    const store = makeStore();
    store.dispatch(setSession({ logged: true, userData: { id: 'user-1', username: 'Test', loader: false } }));
    renderWithProviders(<SpellCreateInput spell={{ ...mockDoc, fileContent: 'data:...' }} />, { store });
    fireEvent.click(screen.getByTestId('spell-create-input-upload-btn'));
    const job = store.getState().spellUpload.queue[0];
    expect(job.title).toBe('Test');
    expect(job.titleWasEdited).toBeFalsy();
  });
});
