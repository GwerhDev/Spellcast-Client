import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/renderWithProviders';

const consts = vi.hoisted(() => ({ enabled: false }));
vi.mock('../../../../config/consts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../config/consts')>();
  return { ...actual, get ACCESS_KEYS_ENABLED() { return consts.enabled; } };
});

const service = vi.hoisted(() => ({
  listAccessKeys: vi.fn(),
  createAccessKey: vi.fn(),
  deleteAccessKey: vi.fn(),
}));
vi.mock('../../../../services/accessKeys', () => service);

const { AccessKeys } = await import('../index');

const HOME = { id: 'k1', name: 'Home', createdAt: '2026-10-21T10:00:00Z' };
const renderKeys = () => renderWithProviders(<AccessKeys />, { preloadedState: { session: { logged: true, userData: { id: 'user-1', loader: false } } } });
const typeName = (value: string) => fireEvent.change(document.getElementById('access-key-name')!, { target: { value } });

beforeEach(() => {
  vi.clearAllMocks();
  consts.enabled = false;
  service.listAccessKeys.mockResolvedValue([]);
});

describe('AccessKeys', () => {
  it('off until the account keeps them: shown disabled, marked as coming, nothing asked for', () => {
    renderKeys();
    expect(screen.getByTestId('access-keys-soon')).toBeInTheDocument();
    expect(document.getElementById('access-key-name')).toBeDisabled();
    expect(screen.getByTestId('access-keys-create')).toBeDisabled();
    expect(service.listAccessKeys).not.toHaveBeenCalled();
  });

  describe('on', () => {
    beforeEach(() => { consts.enabled = true; });

    it('lists the caster\'s keys with when they were made', async () => {
      service.listAccessKeys.mockResolvedValue([HOME]);
      renderKeys();
      const row = await screen.findByTestId('access-key-k1');
      expect(row).toHaveTextContent('Home');
      expect(row).toHaveTextContent(new Date(HOME.createdAt).toLocaleDateString('en'));
      expect(screen.queryByTestId('access-keys-soon')).not.toBeInTheDocument();
    });

    it('says when there are none', async () => {
      renderKeys();
      expect(await screen.findByTestId('access-keys-empty')).toBeInTheDocument();
    });

    it('makes a key with the name given', async () => {
      service.createAccessKey.mockResolvedValue(HOME);
      renderKeys();
      await screen.findByTestId('access-keys-empty');
      expect(screen.getByTestId('access-keys-create')).toBeDisabled();
      typeName('  Home ');
      service.listAccessKeys.mockResolvedValue([HOME]);
      fireEvent.click(screen.getByTestId('access-keys-create'));
      await waitFor(() => expect(service.createAccessKey).toHaveBeenCalledWith('Home'));
      expect(await screen.findByTestId('access-key-k1')).toBeInTheDocument();
      expect((document.getElementById('access-key-name') as HTMLInputElement).value).toBe('');
    });

    it('deletes a key only once it is confirmed', async () => {
      service.listAccessKeys.mockResolvedValue([HOME]);
      service.deleteAccessKey.mockResolvedValue(undefined);
      renderKeys();
      fireEvent.click(await screen.findByTestId('access-key-delete-k1'));
      expect(service.deleteAccessKey).not.toHaveBeenCalled();
      fireEvent.click(screen.getByTestId('delete-confirm-cancel-btn'));
      expect(service.deleteAccessKey).not.toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('access-key-delete-k1'));
      service.listAccessKeys.mockResolvedValue([]);
      fireEvent.click(screen.getByTestId('delete-confirm-confirm-btn'));
      await waitFor(() => expect(service.deleteAccessKey).toHaveBeenCalledWith('k1'));
      expect(await screen.findByTestId('access-keys-empty')).toBeInTheDocument();
    });

    it('says so when the account can\'t be reached', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      service.listAccessKeys.mockRejectedValue(new Error('down'));
      const { store } = renderKeys();
      await waitFor(() => expect(store.getState().apiResponses.responses[0]?.type).toBe('error'));
    });
  });
});
