import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, makeStore } from '../../../test/renderWithProviders';
import { LocalSpellReader } from '../LocalSpellReader';
import { setSession } from '../../../store/sessionSlice';
import * as db from '../../../db';

const loggedStore = () => {
  const store = makeStore();
  store.dispatch(setSession({ logged: true, userData: { id: 'user-1', username: 'Test', loader: false } }));
  return store;
};

const renderPage = (store = loggedStore()) =>
  renderWithProviders(
    <Routes>
      <Route path="/spell/:id/reader" element={<LocalSpellReader />} />
    </Routes>,
    { store, initialPath: '/spell/doc-1/reader' }
  );

describe('LocalSpellReader', () => {
  it('shows a standardized (EmptyState) error panel when the spell is not found', async () => {
    vi.spyOn(db, 'getSpellById').mockResolvedValue(undefined);
    renderPage();

    expect(await screen.findByTestId('local-spell-reader-error')).toHaveTextContent('Spell not found.');
    expect(screen.getByTestId('local-spell-reader-error-back-btn')).toBeInTheDocument();
  });

  it('shows a standardized (EmptyState) error panel when the user is not logged in', async () => {
    const store = makeStore();
    renderPage(store);

    expect(await screen.findByTestId('local-spell-reader-error')).toBeInTheDocument();
  });
});
