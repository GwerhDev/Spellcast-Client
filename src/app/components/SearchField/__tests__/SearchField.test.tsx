import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchField } from '../SearchField';

describe('SearchField', () => {
  it('shows its placeholder, and opens the search when clicked', () => {
    const onClick = vi.fn();
    render(<SearchField label="Search" onClick={onClick} />);
    expect(screen.getByTestId('search-field')).toHaveTextContent('Search');
    fireEvent.click(screen.getByTestId('search-field'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
