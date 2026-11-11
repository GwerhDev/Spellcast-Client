import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppSwitcher } from '../AppSwitcher';

describe('AppSwitcher', () => {
  it('is the apps icon (hexagon nodes), and says what it opens', () => {
    render(<AppSwitcher label="Nhexa apps" onClick={() => {}} />);
    expect(screen.getByTestId('app-switcher-apps-icon')).toHaveAttribute('data-icon', 'hexagon-nodes');
    expect(screen.getByTestId('app-switcher-trigger')).toHaveAttribute('aria-label', 'Nhexa apps');
  });

  it('opens the apps when clicked', () => {
    const onClick = vi.fn();
    render(<AppSwitcher label="Nhexa apps" onClick={onClick} />);
    fireEvent.click(screen.getByTestId('app-switcher-trigger'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
