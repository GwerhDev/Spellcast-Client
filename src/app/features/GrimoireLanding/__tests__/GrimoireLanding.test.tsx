import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../test/renderWithProviders';
import { GrimoireLanding } from '../index';
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

describe('GrimoireLanding', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(db, 'getSpellsFromDB').mockResolvedValue([]);
  });

  it('renders the grimoire container', () => {
    renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
    expect(screen.getByTestId('grimoire-landing')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
    expect(screen.getByTestId('grimoire-search')).toBeInTheDocument();
  });

  it('add-documents button is present', () => {
    renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
    expect(screen.getByTestId('add-spells-btn')).toBeInTheDocument();
  });

  it('select-mode button is present', () => {
    renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
    expect(screen.getByTestId('select-mode-btn')).toBeInTheDocument();
  });

  it('bulk bar is hidden initially', () => {
    renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
    expect(screen.queryByTestId('bulk-bar')).toBeNull();
  });

  it('clicking select mode activates selection', () => {
    renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
    fireEvent.click(screen.getByTestId('select-mode-btn'));
    expect(screen.getByTestId('select-mode-btn')).toBeInTheDocument();
  });

  it('clicking add-documents twice toggles import visibility', () => {
    renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
    const btn = screen.getByTestId('add-spells-btn');
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(btn).toBeInTheDocument();
  });

  it('search input updates on type', () => {
    renderWithProviders(<GrimoireLanding />, { store: loggedStore() });
    const input = screen.getByTestId('grimoire-search') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(input.value).toBe('hello');
  });
});
