import { describe, it, expect } from 'vitest';
import reducer, { setSpellDetails, resetSpellState, setSpellTitle } from '../spellSlice';

const initial = {
  size: null,
  type: '',
  title: '',
  totalPages: 0,
  currentPage: 0,
  fileContent: null,
  isLoaded: false,
};

describe('spellSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initial);
  });

  it('setSpellDetails populates fields and sets isLoaded', () => {
    const payload = { fileContent: 'data:...', title: 'Doc', type: 'pdf', size: 1024, totalPages: 5 };
    const state = reducer(initial, setSpellDetails(payload));
    expect(state.isLoaded).toBe(true);
    expect(state.title).toBe('Doc');
    expect(state.totalPages).toBe(5);
    expect(state.fileContent).toBe('data:...');
    expect(state.type).toBe('pdf');
    expect(state.size).toBe(1024);
  });

  it('setSpellTitle updates only title', () => {
    const state = reducer({ ...initial, title: 'Old' }, setSpellTitle('New'));
    expect(state.title).toBe('New');
    expect(state.isLoaded).toBe(false);
  });

  it('resetSpellState returns to initial', () => {
    const loaded = { size: 500, type: 'pdf', title: 'X', totalPages: 3, currentPage: 1, fileContent: 'abc', isLoaded: true };
    expect(reducer(loaded, resetSpellState())).toEqual(initial);
  });
});
