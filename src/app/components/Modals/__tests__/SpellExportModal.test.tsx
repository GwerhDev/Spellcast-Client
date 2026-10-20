import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { SpellExportModal } from '../SpellExportModal';

const renderModal = (over: Partial<Parameters<typeof SpellExportModal>[0]> = {}) => {
  const props = { show: true, title: 'My Spell', isExporting: false, onClose: vi.fn(), onExport: vi.fn(), accessKeys: [{ id: 'k1', name: 'Home' }], ...over };
  renderWithProviders(<SpellExportModal {...props} />);
  return props;
};
const toProtection = () => fireEvent.click(screen.getByTestId('tab-protection'));
const type = (id: string, value: string) => fireEvent.change(document.getElementById(id)!, { target: { value } });

describe('SpellExportModal', () => {
  it('without protection, it downloads free, as always', () => {
    const props = renderModal();
    fireEvent.click(screen.getByTestId('spell-export-confirm-btn'));
    expect(props.onExport).toHaveBeenCalledWith({ includeSource: false, includeAudio: false, password: undefined, keyIds: [] });
  });

  it('a password is asked twice, and nothing downloads until both match', () => {
    const props = renderModal();
    toProtection();
    fireEvent.click(screen.getByTestId('spell-export-password-toggle'));
    const confirm = screen.getByTestId('spell-export-confirm-btn');
    expect(confirm).toBeDisabled();
    type('spell-export-password', 'correct horse');
    type('spell-export-password-confirm', 'correct hors');
    expect(screen.getByTestId('spell-export-password-mismatch')).toBeInTheDocument();
    expect(confirm).toBeDisabled();
    type('spell-export-password-confirm', 'correct horse');
    expect(screen.queryByTestId('spell-export-password-mismatch')).not.toBeInTheDocument();
    fireEvent.click(confirm);
    expect(props.onExport).toHaveBeenCalledWith(expect.objectContaining({ password: 'correct horse', keyIds: [] }));
  });

  it('protects with the access keys chosen, with or without a password', () => {
    const props = renderModal({ accessKeys: [{ id: 'k1', name: 'Home' }, { id: 'k2', name: 'Work' }] });
    toProtection();
    expect(screen.getByTestId('spell-export-key-k2').closest('div')!.parentElement!.textContent).toContain('Work');
    fireEvent.click(screen.getByTestId('spell-export-key-k2'));
    fireEvent.click(screen.getByTestId('spell-export-confirm-btn'));
    expect(props.onExport).toHaveBeenLastCalledWith(expect.objectContaining({ password: undefined, keyIds: ['k2'] }));
  });

  it('the password starts empty, and the browser is told never to fill it with a saved one', () => {
    renderModal();
    toProtection();
    fireEvent.click(screen.getByTestId('spell-export-password-toggle'));
    for (const id of ['spell-export-password', 'spell-export-password-confirm']) {
      const input = document.getElementById(id) as HTMLInputElement;
      expect(input.value).toBe('');
      expect(input).toHaveAttribute('autocomplete', 'new-password');
      expect(input).toHaveAttribute('type', 'password');
    }
  });

  it('a generated password fills both fields, to copy it', async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const props = renderModal();
    toProtection();
    fireEvent.click(screen.getByTestId('spell-export-password-toggle'));
    expect(screen.getByTestId('spell-export-password-copy')).toBeDisabled();
    fireEvent.click(screen.getByTestId('spell-export-password-generate'));
    const password = document.getElementById('spell-export-password') as HTMLInputElement;
    expect(password.value).toHaveLength(20);
    expect((document.getElementById('spell-export-password-confirm') as HTMLInputElement).value).toBe(password.value);
    fireEvent.click(screen.getByTestId('spell-export-password-copy'));
    expect(writeText).toHaveBeenCalledWith(password.value);
    fireEvent.click(screen.getByTestId('spell-export-confirm-btn'));
    expect(props.onExport).toHaveBeenCalledWith(expect.objectContaining({ password: password.value }));
  });

  it('what goes in the file and what protects it are a tab each, kept while switching', () => {
    const props = renderModal();
    expect(screen.queryByTestId('spell-export-protection')).not.toBeInTheDocument();
    toProtection();
    fireEvent.click(screen.getByTestId('spell-export-password-toggle'));
    fireEvent.click(screen.getByTestId('spell-export-password-generate'));
    fireEvent.click(screen.getByTestId('tab-content'));
    expect(screen.queryByTestId('spell-export-protection')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('spell-export-confirm-btn'));
    expect(props.onExport).toHaveBeenCalledWith(expect.objectContaining({ password: expect.stringMatching(/^.{20}$/) }));
  });

  it('without access keys yet, the access-key option is there, disabled', () => {
    const props = renderModal({ accessKeys: [] });
    toProtection();
    const toggle = screen.getByTestId('spell-export-key-soon');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(screen.getByTestId('spell-export-confirm-btn'));
    expect(props.onExport).toHaveBeenCalledWith(expect.objectContaining({ keyIds: [] }));
  });
});

