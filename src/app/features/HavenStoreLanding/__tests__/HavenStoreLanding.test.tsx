import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { HavenStoreLanding } from '../index';

describe('HavenStoreLanding', () => {
  it('renders the store', () => {
    renderWithProviders(<HavenStoreLanding />);
    expect(screen.getByTestId('haven-store')).toBeInTheDocument();
  });

  it('has no tabs -- sounds, pages and companions all render together on one page', () => {
    renderWithProviders(<HavenStoreLanding />);
    expect(screen.queryByTestId('haven-tab-assets')).not.toBeInTheDocument();
    expect(screen.queryByTestId('haven-tab-companions')).not.toBeInTheDocument();
    expect(screen.getByTestId('companions-grid')).toBeInTheDocument();
  });

  it('shows the search input, unconditionally (no tab gating it)', () => {
    renderWithProviders(<HavenStoreLanding />);
    expect(screen.getByTestId('haven-search')).toBeInTheDocument();
  });

  it('shows the cats companion card, locked by default', () => {
    renderWithProviders(<HavenStoreLanding />);
    expect(screen.getByTestId('companion-card-cats')).toBeInTheDocument();
    // 'cats' is unlockMethod: 'free' but requiresExplicitUnlock -- it's never silently
    // pre-unlocked via FREE_IDS, so the unlock button renders until explicitly clicked.
    expect(screen.getByTestId('companion-unlock-cats')).toBeInTheDocument();
  });

  it('TCORE-109: only ever dispatches unlockAsset -- clicking unlock never equips it', () => {
    renderWithProviders(<HavenStoreLanding />);

    fireEvent.click(screen.getByTestId('companion-unlock-cats'));

    // No equip affordance appears anywhere on the card once owned -- a static "owned"
    // status instead of an activate/deactivate toggle.
    expect(screen.getByTestId('companion-owned-cats')).toBeInTheDocument();
    expect(screen.queryByTestId('companion-toggle-cats')).not.toBeInTheDocument();
    // ...and no active pill, since this page never sets an active id in the first place.
    expect(screen.queryByText(/^active$/i)).not.toBeInTheDocument();
  });

  it('a sound background already owned by default (free, no explicit-unlock gate) shows as owned, never equippable', () => {
    renderWithProviders(<HavenStoreLanding />);
    expect(screen.getByTestId('sound-owned-rain-window')).toBeInTheDocument();
    expect(screen.queryByTestId('sound-toggle-rain-window')).not.toBeInTheDocument();
  });

  it('a page background already owned by default shows as owned, never equippable', () => {
    renderWithProviders(<HavenStoreLanding />);
    expect(screen.getByTestId('page-owned-default')).toBeInTheDocument();
    expect(screen.queryByTestId('page-toggle-default')).not.toBeInTheDocument();
  });

  it('clicking an already-owned page card does nothing (no whole-card equip in acquire mode)', () => {
    renderWithProviders(<HavenStoreLanding />);
    fireEvent.click(screen.getByTestId('page-card-default'));
    // Still just the owned badge, nothing changed.
    expect(screen.getByTestId('page-owned-default')).toBeInTheDocument();
  });

  it('search filters sounds, pages, and companions together by name', () => {
    renderWithProviders(<HavenStoreLanding />);
    fireEvent.change(screen.getByTestId('haven-search'), { target: { value: 'zzz-no-match-zzz' } });
    expect(screen.queryByTestId('sound-card-rain-window')).not.toBeInTheDocument();
    expect(screen.queryByTestId('page-card-default')).not.toBeInTheDocument();
    expect(screen.queryByTestId('companion-card-cats')).not.toBeInTheDocument();
  });
});
