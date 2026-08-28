import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { faBookOpen } from '@fortawesome/free-solid-svg-icons';
import { EmptyState } from '../index';

describe('EmptyState', () => {
  it('renders the icon and message', () => {
    render(<EmptyState icon={faBookOpen} message="No local spells found." />);
    expect(screen.getByText('No local spells found.')).toBeInTheDocument();
  });

  it('renders with the given testId when provided', () => {
    render(<EmptyState icon={faBookOpen} message="Nothing here." testId="my-empty-state" />);
    expect(screen.getByTestId('my-empty-state')).toBeInTheDocument();
  });

  it('renders without a data-testid when none is provided', () => {
    const { container } = render(<EmptyState icon={faBookOpen} message="Nothing here." />);
    expect(container.querySelector('[data-testid]')).toBeNull();
  });
});
