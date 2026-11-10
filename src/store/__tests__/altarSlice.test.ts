import { describe, expect, it } from 'vitest';
import reducer, { departureTargeted, spellArriving, spellDeparting, spellLanded, spellReturned } from '../altarSlice';

const rect = (left: number) => ({ left, top: 10, width: 100, height: 140 });
const base = () => reducer(undefined, { type: 'init' });

describe('altarSlice: spells arriving at and leaving the altar', () => {
  it('keeps a spell arriving until it has landed', () => {
    let state = reducer(base(), spellArriving({ spellId: 's1', via: 'drop', from: rect(1) }));
    expect(state.arrival).toEqual({ spellId: 's1', via: 'drop', from: rect(1) });
    state = reducer(state, spellLanded());
    expect(state.arrival).toBeNull();
  });

  it('keeps a spell leaving, then where its card is and its cover, until it is back', () => {
    let state = reducer(base(), spellDeparting({ spellId: 's1', from: rect(500) }));
    expect(state.departure).toEqual({ spellId: 's1', from: rect(500), to: null, coverUrl: null });
    state = reducer(state, departureTargeted({ to: rect(20), coverUrl: 'blob:cover' }));
    expect(state.departure).toMatchObject({ to: rect(20), coverUrl: 'blob:cover' });
    state = reducer(state, spellReturned());
    expect(state.departure).toBeNull();
  });

  it('has nowhere to send a target to when nothing is leaving', () => {
    expect(reducer(base(), departureTargeted({ to: rect(20), coverUrl: null })).departure).toBeNull();
  });
});
