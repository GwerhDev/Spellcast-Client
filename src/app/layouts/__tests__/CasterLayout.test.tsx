import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders, makeStore } from '../../../test/renderWithProviders';
import { CasterLayout } from '../CasterLayout';
import { setSession } from '../../../store/sessionSlice';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const loggedStore = () => {
  const store = makeStore();
  store.dispatch(setSession({ logged: true, userData: { id: 'user-1', username: 'Gwerh', loader: false } }));
  return store;
};

const renderLayout = (initialPath: string) =>
  renderWithProviders(
    <Routes>
      <Route element={<CasterLayout />}>
        <Route path="/caster/profile" element={<div data-testid="outlet-child">profile body</div>} />
        <Route path="/caster/storage" element={<div data-testid="outlet-child">storage body</div>} />
        <Route path="/caster/storage/local" element={<div data-testid="outlet-child">storage local body</div>} />
      </Route>
    </Routes>,
    { store: loggedStore(), initialPath }
  );

describe('CasterLayout', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders the header with the session's username", () => {
    renderLayout('/caster/profile');
    expect(screen.getByTestId('caster-header-username')).toHaveTextContent('Gwerh');
  });

  it('renders the outlet content below the tab bar', () => {
    renderLayout('/caster/profile');
    expect(screen.getByTestId('outlet-child')).toHaveTextContent('profile body');
  });

  it('renders a tab for every caster section, mirroring the sidebar', () => {
    renderLayout('/caster/profile');
    ['profile', 'stats', 'groups', 'shared', 'storage', 'settings'].forEach(id => {
      expect(screen.getByTestId(`segmented-tab-${id}`)).toBeInTheDocument();
    });
  });

  it('marks the tab matching the current route as active', () => {
    renderLayout('/caster/profile');
    expect(screen.getByTestId('segmented-tab-profile').className).toMatch(/active/);
  });

  it('marks "Storage" active even on a descendant route like /caster/storage/local', () => {
    renderLayout('/caster/storage/local');
    expect(screen.getByTestId('segmented-tab-storage').className).toMatch(/active/);
    expect(screen.getByTestId('outlet-child')).toHaveTextContent('storage local body');
  });

  it('navigates to the clicked tab\'s route', () => {
    renderLayout('/caster/profile');
    fireEvent.click(screen.getByTestId('segmented-tab-storage'));
    expect(mockNavigate).toHaveBeenCalledWith('/caster/storage');
  });
});
