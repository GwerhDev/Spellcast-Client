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
        <Route path="/caster/settings" element={<div data-testid="outlet-child">settings body</div>} />
        {/* Storage/Credentials/etc. are flat items reached one level under Settings
            (TCORE-109) -- this stands in for any such nested route under a top-level tab. */}
        <Route path="/caster/settings/storage" element={<div data-testid="outlet-child">settings storage body</div>} />
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
    ['profile', 'stats', 'inventory', 'groups', 'shared', 'settings'].forEach(id => {
      expect(screen.getByTestId(`segmented-tab-${id}`)).toBeInTheDocument();
    });
  });

  it('marks the tab matching the current route as active', () => {
    renderLayout('/caster/profile');
    expect(screen.getByTestId('segmented-tab-profile').className).toMatch(/active/);
  });

  it('marks "Settings" active even on a descendant route like /caster/settings/storage', () => {
    renderLayout('/caster/settings/storage');
    expect(screen.getByTestId('segmented-tab-settings').className).toMatch(/active/);
    expect(screen.getByTestId('outlet-child')).toHaveTextContent('settings storage body');
  });

  it('navigates to the clicked tab\'s route', () => {
    renderLayout('/caster/profile');
    fireEvent.click(screen.getByTestId('segmented-tab-inventory'));
    expect(mockNavigate).toHaveBeenCalledWith('/caster/inventory');
  });
});
