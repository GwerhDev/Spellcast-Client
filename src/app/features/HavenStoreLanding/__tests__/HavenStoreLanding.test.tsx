import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { HavenStoreLanding } from '../index';

describe('HavenStoreLanding', () => {
  it('renders the store', () => {
    renderWithProviders(<HavenStoreLanding />);
    expect(screen.getByTestId('haven-store')).toBeInTheDocument();
  });

  it('shows assets and companions tabs', () => {
    renderWithProviders(<HavenStoreLanding />);
    expect(screen.getByTestId('haven-tab-assets')).toBeInTheDocument();
    expect(screen.getByTestId('haven-tab-companions')).toBeInTheDocument();
  });

  it('shows search input on assets tab', () => {
    renderWithProviders(<HavenStoreLanding />);
    expect(screen.getByTestId('haven-search')).toBeInTheDocument();
  });

  it('hides search when companions tab is active', () => {
    renderWithProviders(<HavenStoreLanding />);
    fireEvent.click(screen.getByTestId('haven-tab-companions'));
    expect(screen.queryByTestId('haven-search')).toBeNull();
  });

  it('switches back to assets tab', () => {
    renderWithProviders(<HavenStoreLanding />);
    fireEvent.click(screen.getByTestId('haven-tab-companions'));
    fireEvent.click(screen.getByTestId('haven-tab-assets'));
    expect(screen.getByTestId('haven-search')).toBeInTheDocument();
  });

  it('shows the cats companion card, locked by default', () => {
    renderWithProviders(<HavenStoreLanding />);
    fireEvent.click(screen.getByTestId('haven-tab-companions'));
    expect(screen.getByTestId('companions-grid')).toBeInTheDocument();
    expect(screen.getByTestId('companion-card-cats')).toBeInTheDocument();
    // 'cats' is unlockMethod: 'free' but requiresExplicitUnlock — it's never silently
    // pre-unlocked via FREE_IDS, so the unlock button renders, not the toggle button,
    // until the user explicitly clicks it.
    expect(screen.getByTestId('companion-unlock-cats')).toBeInTheDocument();
  });

  it('unlocks, activates, and deactivates the cats companion on click', () => {
    renderWithProviders(<HavenStoreLanding />);
    fireEvent.click(screen.getByTestId('haven-tab-companions'));

    // First click unlocks it and activates it in the same action (see handleCompanionAction).
    fireEvent.click(screen.getByTestId('companion-unlock-cats'));
    expect(screen.getByTestId('companion-toggle-cats').textContent).toContain('Deactivate');

    fireEvent.click(screen.getByTestId('companion-toggle-cats'));
    expect(screen.getByTestId('companion-toggle-cats').textContent).toContain('Set active');
  });
});
