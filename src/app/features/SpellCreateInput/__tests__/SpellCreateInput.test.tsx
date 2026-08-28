import { describe, it, expect, vi } from 'vitest';
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
    renderWithProviders(<SpellCreateInput spell={mockDoc} onTitleChange={vi.fn()} />);
    expect(screen.getByTestId('spell-create-input')).toBeInTheDocument();
  });

  it('reports title edits via onTitleChange instead of writing to redux directly', () => {
    const onTitleChange = vi.fn();
    renderWithProviders(<SpellCreateInput spell={mockDoc} onTitleChange={onTitleChange} />);

    fireEvent.click(screen.getByTestId('spell-create-input-title'));
    fireEvent.change(screen.getByTestId('spell-create-input-title'), { target: { value: 'New Title' } });

    expect(onTitleChange).toHaveBeenCalledWith('New Title');
  });

  describe('enqueued job title tracking', () => {
    const renderWithSession = (spell: SpellState) => {
      const store = makeStore();
      store.dispatch(setSession({ logged: true, userData: { id: 'user-1', username: 'Test', loader: false } }));
      renderWithProviders(<SpellCreateInput spell={spell} onTitleChange={vi.fn()} />, { store });
      return store;
    };

    it('enqueues with titleWasEdited: false when the title was never touched', () => {
      const store = renderWithSession({ ...mockDoc, fileContent: 'data:...' });
      fireEvent.click(screen.getByTestId('spell-create-input-upload-btn'));
      expect(store.getState().spellUpload.queue[0].titleWasEdited).toBe(false);
    });

    it('enqueues with titleWasEdited: true once the user has edited the title field', () => {
      const store = renderWithSession({ ...mockDoc, fileContent: 'data:...' });
      fireEvent.click(screen.getByTestId('spell-create-input-title'));
      fireEvent.change(screen.getByTestId('spell-create-input-title'), { target: { value: 'New Title' } });
      fireEvent.click(screen.getByTestId('spell-create-input-upload-btn'));
      expect(store.getState().spellUpload.queue[0].titleWasEdited).toBe(true);
    });
  });
});
