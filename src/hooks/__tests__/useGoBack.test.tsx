import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useGoBack } from '../useGoBack';

const Back = ({ fallback }: { fallback?: string }) => {
  const goBack = useGoBack(fallback);
  return <button data-testid="back" onClick={goBack} />;
};

// The real browser history (jsdom's), as the app uses it: the router's own entry numbers
// live there, which MemoryRouter doesn't write.
const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<div data-testid="home" />} />
      <Route path="/spell/:id" element={<Link data-testid="to-reader" to="/spell/s1/reader">reader</Link>} />
      <Route path="/spell/:id/reader" element={<Back />} />
      <Route path="/caster/settings" element={<div data-testid="settings" />} />
      <Route path="/caster/settings/about" element={<Back fallback="/caster/settings" />} />
    </Routes>
  </BrowserRouter>
);

describe('useGoBack', () => {
  beforeEach(() => { window.history.replaceState(null, '', '/'); });

  it('goes back to the app page it came from', async () => {
    window.history.replaceState(null, '', '/spell/s1');
    render(<App />);
    fireEvent.click(screen.getByTestId('to-reader'));
    fireEvent.click(screen.getByTestId('back'));
    // jsdom moves back through the history but doesn't announce it the way a browser does
    // (popstate), which is what the router listens to: announce it here.
    await waitFor(() => expect(window.location.pathname).toBe('/spell/s1'));
    act(() => { window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state })); });
    expect(screen.getByTestId('to-reader')).toBeInTheDocument();
  });

  it('goes home when the page was opened directly, never leaving the app', () => {
    window.history.replaceState(null, '', '/spell/s1/reader');
    render(<App />);
    fireEvent.click(screen.getByTestId('back'));
    expect(window.location.pathname).toBe('/');
    expect(screen.getByTestId('home')).toBeInTheDocument();
  });

  it('goes to its fallback instead of home when given one', () => {
    window.history.replaceState(null, '', '/caster/settings/about');
    render(<App />);
    fireEvent.click(screen.getByTestId('back'));
    expect(window.location.pathname).toBe('/caster/settings');
    expect(screen.getByTestId('settings')).toBeInTheDocument();
  });
});

