import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import reducer, { setSession, clearSession, setLoader } from '../sessionSlice';
import type { Session } from '../../interfaces';

const initial: Session = { logged: false, userData: { loader: true } };

describe('sessionSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initial);
  });

  it('setSession replaces the entire session with the payload', () => {
    const session: Session = { logged: true, userData: { loader: false, id: 'user-1', email: 'a@b.com' } };
    expect(reducer(initial, setSession(session))).toEqual(session);
  });

  it('setLoader only touches userData.loader, leaving the rest of the session intact', () => {
    const loggedIn: Session = { logged: true, userData: { loader: true, id: 'user-1' } };
    const state = reducer(loggedIn, setLoader(false));
    expect(state).toEqual({ logged: true, userData: { loader: false, id: 'user-1' } });
  });

  describe('clearSession', () => {
    const originalLocation = window.location;

    // clearSession assigns window.location.href to navigate away -- happy-dom's
    // real Location setter treats that as an actual same-document navigation and
    // enforces origin rules that then reject restoring the original URL afterward.
    // Swapping in a plain writable stub for the duration of these tests avoids a
    // real navigation entirely; nothing else in this suite depends on the page's
    // real location.
    beforeEach(() => {
      Object.defineProperty(window, 'location', { writable: true, configurable: true, value: { href: 'http://localhost:3000/' } });
    });
    afterEach(() => {
      Object.defineProperty(window, 'location', { writable: true, configurable: true, value: originalLocation });
    });

    it('resets to the logged-out initial shape', () => {
      const loggedIn: Session = { logged: true, userData: { loader: false, id: 'user-1' } };
      const state = reducer(loggedIn, clearSession());
      expect(state).toEqual({ logged: false, userData: { loader: true } });
    });

    it('redirects to the account login page with a callback to this client', () => {
      reducer(initial, clearSession());
      expect(window.location.href).toContain('/login?callback=');
    });
  });
});
