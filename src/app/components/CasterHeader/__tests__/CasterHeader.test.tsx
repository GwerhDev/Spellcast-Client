import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { CasterHeader } from '../CasterHeader';

describe('CasterHeader', () => {
  it('renders the username', () => {
    renderWithProviders(<CasterHeader username="Gwerh" />);
    expect(screen.getByTestId('caster-header-username')).toHaveTextContent('Gwerh');
  });

  it('shows an avatar image when profilePic is set', () => {
    renderWithProviders(<CasterHeader username="Gwerh" profilePic="https://example.com/pic.png" />);
    expect(screen.getByTestId('caster-header-avatar-image')).toHaveAttribute('src', 'https://example.com/pic.png');
  });

  it('falls back to a first-letter initial when there is no profilePic', () => {
    renderWithProviders(<CasterHeader username="Gwerh" />);
    expect(screen.queryByTestId('caster-header-avatar-image')).not.toBeInTheDocument();
    expect(screen.getByTestId('caster-header-avatar-initial')).toHaveTextContent('G');
  });

  it('shows the XP bar and level/achievements copy', () => {
    renderWithProviders(<CasterHeader username="Gwerh" />);
    expect(screen.getByTestId('caster-header-xp')).toHaveTextContent('0 / 500');
  });

  it('renders nothing in the details area while loader is true (skeleton state)', () => {
    renderWithProviders(<CasterHeader username="Gwerh" loader />);
    expect(screen.queryByTestId('caster-header-username')).not.toBeInTheDocument();
    expect(screen.queryByTestId('caster-header-xp')).not.toBeInTheDocument();
  });
});
