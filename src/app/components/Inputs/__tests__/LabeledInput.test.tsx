import { describe, it, expect, vi, afterEach } from 'vitest';
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

  // A password not to be saved (a .spell's): password managers offer to save whatever was
  // typed in a password field, so it's a text field with its characters masked by CSS.
  describe('a password not to be saved', () => {
    afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
    const loadWith = async (masks: boolean) => {
      vi.stubGlobal('CSS', { supports: (property: string) => masks && property === '-webkit-text-security' });
      vi.resetModules();
      // Fresh, the providers too: the input reads the language from the same module instance.
      const [{ LabeledInput: Input }, { renderWithProviders: renderFresh }] = await Promise.all([
        import('../LabeledInput'), import('../../../../test/renderWithProviders'),
      ]);
      return { Input, renderFresh };
    };

    it('is a masked text field the managers keep out of, shown by its eye', async () => {
      const { Input, renderFresh } = await loadWith(true);
      renderFresh(<Input id="pw" name="pw" label="Password" type="password" notSaved value="secret" onChange={() => {}} />);
      const input = document.getElementById('pw') as HTMLInputElement;
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('autocomplete', 'off');
      expect(input).toHaveAttribute('data-1p-ignore');
      expect(input.className).toMatch(/masked/);
      fireEvent.click(screen.getByTestId('pw-reveal'));
      expect(input.className).not.toMatch(/masked/);
    });

    it('stays a password field where the masking is not supported, never filled with a saved one', async () => {
      const { Input, renderFresh } = await loadWith(false);
      renderFresh(<Input id="pw" name="pw" label="Password" type="password" notSaved value="secret" onChange={() => {}} />);
      const input = document.getElementById('pw') as HTMLInputElement;
      expect(input).toHaveAttribute('type', 'password');
      expect(input).toHaveAttribute('autocomplete', 'new-password');
      expect(input).toHaveAttribute('data-lpignore', 'true');
    });
  });

  it('any other field has no eye', () => {
    render(<LabeledInput id="name" name="name" label="Name" value="" onChange={() => {}} />);
    expect(screen.queryByTestId('name-reveal')).not.toBeInTheDocument();
  });
});
