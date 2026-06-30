import { describe, it, expect, vi } from 'vitest';
import reducer, { getCredentials, updateCredential, updateSingleCredential } from '../credentialsSlice';
import type { TTS_Credential } from '../../interfaces';

vi.mock('../../services/credentials', () => ({
  getCredentials: vi.fn(),
  updateCredential: vi.fn(),
}));

const initial = { credentials: [], loading: false, error: null };

const mockCred: TTS_Credential = { id: 'c1', azure_key: 'key', region: 'us', voices: [] };

describe('credentialsSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initial);
  });

  it('getCredentials.pending sets loading', () => {
    const state = reducer(initial, { type: getCredentials.pending.type });
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('getCredentials.fulfilled stores credentials', () => {
    const action = getCredentials.fulfilled([mockCred], '', undefined);
    const state = reducer({ ...initial, loading: true }, action);
    expect(state.loading).toBe(false);
    expect(state.credentials).toEqual([mockCred]);
  });

  it('getCredentials.rejected stores error', () => {
    const action = getCredentials.rejected(new Error('Unauthorized'), '', undefined);
    const state = reducer({ ...initial, loading: true }, action);
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Unauthorized');
  });

  it('updateCredential.fulfilled replaces credentials list', () => {
    const updated = { ...mockCred, region: 'eu' };
    const action = updateCredential.fulfilled({ credentials: [updated] }, '', { credentialId: 'c1', data: {} });
    const state = reducer({ ...initial, credentials: [mockCred], loading: true }, action);
    expect(state.loading).toBe(false);
    expect(state.credentials[0].region).toBe('eu');
  });

  it('updateSingleCredential replaces matching credential in list', () => {
    const updated = { ...mockCred, region: 'eu' };
    const state = reducer({ ...initial, credentials: [mockCred] }, updateSingleCredential(updated));
    expect(state.credentials[0].region).toBe('eu');
  });

  it('updateSingleCredential is no-op for unknown id', () => {
    const unknown = { ...mockCred, id: 'unknown' };
    const state = reducer({ ...initial, credentials: [mockCred] }, updateSingleCredential(unknown));
    expect(state.credentials).toEqual([mockCred]);
  });
});
