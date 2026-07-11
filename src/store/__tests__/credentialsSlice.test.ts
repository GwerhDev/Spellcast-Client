import { describe, it, expect, vi } from 'vitest';
import reducer, {
  getCredentials,
  updateCredential,
  updateSingleCredential,
  setCurrentCredentialId,
  updateCurrentCredential,
  selectCurrentCredential,
} from '../credentialsSlice';
import type { RootState } from '..';
import type { TTS_Credential } from '../../interfaces';

vi.mock('../../services/credentials', () => ({
  getCredentials: vi.fn(),
  updateCredential: vi.fn(),
  setCurrentCredential: vi.fn(),
}));

const initial = { credentials: [], currentCredentialId: null, loading: false, error: null };

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

  it('setCurrentCredentialId sets the active credential id', () => {
    const state = reducer(initial, setCurrentCredentialId('c1'));
    expect(state.currentCredentialId).toBe('c1');
    const cleared = reducer(state, setCurrentCredentialId(null));
    expect(cleared.currentCredentialId).toBeNull();
  });

  it('updateCurrentCredential.fulfilled stores the id', () => {
    const action = updateCurrentCredential.fulfilled('c1', '', 'c1');
    const state = reducer(initial, action);
    expect(state.currentCredentialId).toBe('c1');
  });

  it('selectCurrentCredential returns the active credential or null', () => {
    const base = { credentials: { credentials: [mockCred], currentCredentialId: 'c1' } } as unknown as RootState;
    expect(selectCurrentCredential(base)).toEqual(mockCred);

    const none = { credentials: { credentials: [mockCred], currentCredentialId: null } } as unknown as RootState;
    expect(selectCurrentCredential(none)).toBeNull();
  });
});
