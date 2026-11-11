import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppTitle } from '../AppTitle';

describe('AppTitle', () => {
  it("shows the app's name, and goes home when clicked", () => {
    const onClick = vi.fn();
    render(<AppTitle label="Spellcast" onClick={onClick} />);
    expect(screen.getByTestId('app-title')).toHaveTextContent('SPELLCAST');
    fireEvent.click(screen.getByTestId('app-title'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows the app's icon beside its name", () => {
    render(<AppTitle label="Spellcast" iconSrc="/spellcast.svg" onClick={() => {}} />);
    expect(screen.getByTestId('app-title-icon')).toHaveAttribute('src', '/spellcast.svg');
  });
});
