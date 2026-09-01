import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { CasterProfileLanding } from '../index';

describe('CasterProfileLanding', () => {
  it('renders the mock quotes section', () => {
    renderWithProviders(<CasterProfileLanding />);
    expect(screen.getByTestId('caster-profile-quotes')).toBeInTheDocument();
    expect(screen.getAllByTestId('caster-profile-quote-card').length).toBeGreaterThan(0);
  });

  it('renders the mock grimoire section', () => {
    renderWithProviders(<CasterProfileLanding />);
    expect(screen.getByTestId('caster-profile-grimoire')).toBeInTheDocument();
    expect(screen.getAllByTestId('caster-profile-grimoire-card').length).toBeGreaterThan(0);
  });

  it('marks the mock sections as placeholder data', () => {
    renderWithProviders(<CasterProfileLanding />);
    expect(screen.getByTestId('caster-profile-mock-notice')).toBeInTheDocument();
  });
});
