import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import React from 'react';
import { makeStore } from '../../test/renderWithProviders';
import { usePageListToggle } from '../usePageListToggle';

const media = vi.hoisted(() => ({ narrow: false }));
vi.mock('../useMediaQuery', () => ({ useMediaQuery: () => media.narrow }));

const render = (place: 'reader' | 'editor', store = makeStore()) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  return { store, ...renderHook(() => usePageListToggle(place), { wrapper }) };
};

beforeEach(() => { media.narrow = false; });

describe('usePageListToggle', () => {
  it("on a wide screen, stays as the caster left it, each place's own, kept with the layout", () => {
    const { store, result } = render('reader');
    expect(result.current.open).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.open).toBe(false);
    expect(store.getState().layout.pageListOpen).toEqual({ reader: false, editor: true });
    // Opened again (another page, a reload): as it was left.
    expect(render('reader', store).result.current.open).toBe(false);
    expect(render('editor', store).result.current.open).toBe(true);
  });

  it('on a phone, starts hidden over the page, and is not kept', () => {
    media.narrow = true;
    const { store, result } = render('reader');
    expect(result.current.open).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);
    expect(store.getState().layout.pageListOpen.reader).toBe(true);
    act(() => result.current.toggle());
    expect(store.getState().layout.pageListOpen.reader).toBe(true);
  });
});
