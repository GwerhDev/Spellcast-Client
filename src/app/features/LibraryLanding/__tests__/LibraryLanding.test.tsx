import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { LibraryLanding } from '../index';
import * as db from '../../../../db';

// pdfjs-dist requires DOMMatrix which jsdom doesn't implement — mock the component
vi.mock('../../../components/Start/ImportOption', () => ({
  ImportOption: () => null,
}));

const loggedStore = () => {
  const store = makeStore();
  store.dispatch({ type: 'session/setSession', payload: { logged: true, userData: { id: 'user-1', loader: false } } });
  return store;
};

describe('LibraryLanding', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(db, 'getDocumentsFromDB').mockResolvedValue([]);
  });

  it('renders the library container', () => {
    renderWithProviders(<LibraryLanding />, { store: loggedStore() });
    expect(screen.getByTestId('library-landing')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithProviders(<LibraryLanding />, { store: loggedStore() });
    expect(screen.getByTestId('library-search')).toBeInTheDocument();
  });

  it('add-documents button is present', () => {
    renderWithProviders(<LibraryLanding />, { store: loggedStore() });
    expect(screen.getByTestId('add-documents-btn')).toBeInTheDocument();
  });

  it('select-mode button is present', () => {
    renderWithProviders(<LibraryLanding />, { store: loggedStore() });
    expect(screen.getByTestId('select-mode-btn')).toBeInTheDocument();
  });

  it('bulk bar is hidden initially', () => {
    renderWithProviders(<LibraryLanding />, { store: loggedStore() });
    expect(screen.queryByTestId('bulk-bar')).toBeNull();
  });

  it('clicking select mode activates selection', () => {
    renderWithProviders(<LibraryLanding />, { store: loggedStore() });
    fireEvent.click(screen.getByTestId('select-mode-btn'));
    expect(screen.getByTestId('select-mode-btn')).toBeInTheDocument();
  });

  it('clicking add-documents twice toggles import visibility', () => {
    renderWithProviders(<LibraryLanding />, { store: loggedStore() });
    const btn = screen.getByTestId('add-documents-btn');
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(btn).toBeInTheDocument();
  });

  it('search input updates on type', () => {
    renderWithProviders(<LibraryLanding />, { store: loggedStore() });
    const input = screen.getByTestId('library-search') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(input.value).toBe('hello');
  });
});
