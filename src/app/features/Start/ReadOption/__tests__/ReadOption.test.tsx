import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, makeStore } from '../../../../../test/renderWithProviders';
import { setSpellFile } from '../../../../../store/spellReaderSlice';
import { ReadOption } from '../index';

describe('ReadOption', () => {
  it('invites dragging a spell when nothing is loaded, with the button disabled', () => {
    renderWithProviders(<ReadOption dragActive={false} />);
    expect(screen.getByTestId('read-option-hint')).toHaveTextContent('Drag a spell');
    expect(screen.getByTestId('play-button')).toBeDisabled();
  });

  it('asks to drop while a spell is dragged over, glowing but keeping the play icon', () => {
    renderWithProviders(<ReadOption dragActive />);
    expect(screen.getByTestId('read-option-hint')).toHaveTextContent('Drop it');
    expect(screen.getByTestId('play-button')).not.toBeDisabled();
  });

  it('shows the loaded spell and toggles playback from the button', () => {
    const store = makeStore();
    store.dispatch(setSpellFile({ id: 'spell-1', title: 'Spell one' }));
    renderWithProviders(<ReadOption dragActive={false} />, { store });
    expect(screen.getByTestId('read-option-hint')).toHaveTextContent('Spell one');
    const before = store.getState().browserPlayer.toggleSeq;
    fireEvent.click(screen.getByTestId('play-button'));
    expect(store.getState().browserPlayer.toggleSeq).toBe(before + 1);
  });
});
