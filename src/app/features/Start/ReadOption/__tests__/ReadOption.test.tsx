import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../../test/renderWithProviders';
import { setSpellFile } from '../../../../../store/spellReaderSlice';
import { ReadOption } from '../index';

describe('ReadOption', () => {
  it('with nothing loaded, shows the Spellcast mark on an idle (not disabled) button that ignores clicks', () => {
    const store = makeStore();
    renderWithProviders(<ReadOption dragActive={false} />, { store });
    expect(screen.getByTestId('read-option-hint')).toHaveTextContent('Drag a spell');
    const button = screen.getByTestId('play-button');
    expect(screen.getByTestId('read-option-brand-icon')).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(button);
    expect(store.getState().browserPlayer.toggleSeq).toBe(0);
    expect(store.getState().audioPlayer.toggleSeq).toBe(0);
  });

  it('turns back into a play button while a spell is dragged over', () => {
    renderWithProviders(<ReadOption dragActive />);
    expect(screen.getByTestId('read-option-hint')).toHaveTextContent('Drop it');
    expect(screen.queryByTestId('read-option-brand-icon')).not.toBeInTheDocument();
    expect(screen.getByTestId('play-button')).not.toHaveAttribute('aria-disabled');
  });

  it('shows the loaded spell and toggles playback from the button', () => {
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<ReadOption dragActive={false} />, { store });
    expect(screen.getByTestId('read-option-hint')).toHaveTextContent('Spell one');
    expect(screen.queryByTestId('read-option-brand-icon')).not.toBeInTheDocument();
    const before = store.getState().browserPlayer.toggleSeq;
    fireEvent.click(screen.getByTestId('play-button'));
    expect(store.getState().browserPlayer.toggleSeq).toBe(before + 1);
  });
});
