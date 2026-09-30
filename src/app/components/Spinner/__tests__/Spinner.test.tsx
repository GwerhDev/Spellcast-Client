import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '../index';

describe('Spinner', () => {
  it('renders nothing when not loading', () => {
    const { container } = render(<Spinner isLoading={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the app's mark inside the ring, with the message when given", () => {
    render(<Spinner isLoading message="Loading…" />);
    expect(screen.getByTestId('spinner')).toHaveTextContent('Loading…');
    expect(screen.getByTestId('spinner-logo')).toBeInTheDocument();
  });
});
