import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { LabeledInput } from '../LabeledInput';

describe('LabeledInput', () => {
  it('a password field has an eye that shows what is typed, and hides it again', () => {
    renderWithProviders(<LabeledInput id="pw" name="pw" label="Password" type="password" value="secret" onChange={() => {}} />);
    const input = document.getElementById('pw') as HTMLInputElement;
    const eye = screen.getByTestId('pw-reveal');
    expect(input).toHaveAttribute('type', 'password');
    fireEvent.click(eye);
    expect(input).toHaveAttribute('type', 'text');
    expect(eye).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(eye);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('any other field has no eye', () => {
    render(<LabeledInput id="name" name="name" label="Name" value="" onChange={() => {}} />);
    expect(screen.queryByTestId('name-reveal')).not.toBeInTheDocument();
  });
});
