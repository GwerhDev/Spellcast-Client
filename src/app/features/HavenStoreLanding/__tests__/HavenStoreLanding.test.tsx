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
});
