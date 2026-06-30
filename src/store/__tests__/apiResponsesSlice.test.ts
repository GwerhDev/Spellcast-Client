import { describe, it, expect } from 'vitest';
import reducer, { addApiResponse, removeApiResponse, clearApiResponses } from '../apiResponsesSlice';

const initial = { responses: [] };

describe('apiResponsesSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initial);
  });

  it('addApiResponse appends a response with an id', () => {
    const state = reducer(initial, addApiResponse({ message: 'OK', type: 'success' }));
    expect(state.responses).toHaveLength(1);
    expect(state.responses[0].message).toBe('OK');
    expect(state.responses[0].type).toBe('success');
    expect(state.responses[0].id).toBeTruthy();
  });

  it('addApiResponse appends multiple responses', () => {
    let state = reducer(initial, addApiResponse({ message: 'A', type: 'success' }));
    state = reducer(state, addApiResponse({ message: 'B', type: 'error' }));
    expect(state.responses).toHaveLength(2);
  });

  it('removeApiResponse removes by id', () => {
    let state = reducer(initial, addApiResponse({ message: 'X', type: 'error' }));
    const id = state.responses[0].id;
    state = reducer(state, removeApiResponse(id));
    expect(state.responses).toHaveLength(0);
  });

  it('removeApiResponse with unknown id is a no-op', () => {
    let state = reducer(initial, addApiResponse({ message: 'Y', type: 'success' }));
    state = reducer(state, removeApiResponse('nonexistent'));
    expect(state.responses).toHaveLength(1);
  });

  it('clearApiResponses empties the list', () => {
    let state = reducer(initial, addApiResponse({ message: 'A', type: 'success' }));
    state = reducer(state, addApiResponse({ message: 'B', type: 'error' }));
    expect(reducer(state, clearApiResponses()).responses).toHaveLength(0);
  });
});
