import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { Toast } from '../index';
import { addApiResponse } from '../../../../store/apiResponsesSlice';

describe('Toast', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders container even when empty', () => {
    renderWithProviders(<Toast />);
    expect(screen.getByTestId('toast-container')).toBeInTheDocument();
  });

  it('shows a success toast when response is added', () => {
    const store = makeStore();
    store.dispatch(addApiResponse({ message: 'Saved!', type: 'success' }));
    renderWithProviders(<Toast />, { store });
    const id = store.getState().apiResponses.responses[0].id;
    expect(screen.getByTestId(`toast-${id}`)).toBeInTheDocument();
  });

  it('shows an error toast when response is added', () => {
    const store = makeStore();
    store.dispatch(addApiResponse({ message: 'Something went wrong', type: 'error' }));
    renderWithProviders(<Toast />, { store });
    const id = store.getState().apiResponses.responses[0].id;
    expect(screen.getByTestId(`toast-${id}`)).toBeInTheDocument();
  });

  it('removes toast when clicked', () => {
    const store = makeStore();
    store.dispatch(addApiResponse({ message: 'Click me', type: 'success' }));
    renderWithProviders(<Toast />, { store });
    const id = store.getState().apiResponses.responses[0].id;
    fireEvent.click(screen.getByTestId(`toast-${id}`));
    expect(store.getState().apiResponses.responses).toHaveLength(0);
  });
});
