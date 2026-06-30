import { describe, it, expect, vi } from 'vitest';
import reducer, { getGroups } from '../groupsSlice';
import type { Group } from '../../interfaces';

vi.mock('../../services/groups', () => ({
  getGroups: vi.fn(),
}));

const initial = { groups: [], loading: false, error: null };

const mockGroups: Group[] = [
  { id: 'g1', name: 'Alpha' },
  { id: 'g2', name: 'Beta' },
];

describe('groupsSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initial);
  });

  it('getGroups.pending sets loading to true', () => {
    const action = { type: getGroups.pending.type };
    const state = reducer(initial, action);
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('getGroups.fulfilled stores groups and clears loading', () => {
    const action = getGroups.fulfilled(mockGroups, '', undefined);
    const state = reducer({ ...initial, loading: true }, action);
    expect(state.loading).toBe(false);
    expect(state.groups).toEqual(mockGroups);
  });

  it('getGroups.rejected stores error message', () => {
    const action = getGroups.rejected(new Error('Network error'), '', undefined);
    const state = reducer({ ...initial, loading: true }, action);
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Network error');
  });

  it('getGroups.rejected with empty message uses fallback', () => {
    const err = new Error('');
    err.message = '';
    const action = getGroups.rejected(err, '', undefined);
    const state = reducer({ ...initial, loading: true }, action);
    expect(state.error).toBe('Failed to fetch credentials');
  });
});
