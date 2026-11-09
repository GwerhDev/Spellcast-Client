import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchButton } from '../SearchButton';

describe('SearchButton', () => {
  it('is a magnifying glass, named for a screen reader, that opens the search', () => {
    const onClick = vi.fn();
    render(<SearchButton label="Search" onClick={onClick} />);
    const button = screen.getByTestId('search-button');
    expect(button).toHaveAttribute('aria-label', 'Search');
    expect(button.querySelector('svg')).toHaveAttribute('data-icon', 'magnifying-glass');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
