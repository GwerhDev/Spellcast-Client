import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// A user preference like theme/language (see ThemeContext.tsx, which this deliberately
// mirrors) -- persisted to localStorage directly rather than Redux, so it's available
// before the session/store hydrates and survives across sessions per-browser, same as
// 'theme'. Scope right now is intentionally just the toggle + its persisted value: no
// screen reacts to this yet (that's follow-up work once the toggle itself is confirmed
// working) -- consumers subscribe via useMode3D() and decide for themselves what to do
// with it.
const STORAGE_KEY = 'mode3d';

interface Mode3DContextType {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const Mode3DContext = createContext<Mode3DContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useMode3D = (): Mode3DContextType => {
  const context = useContext(Mode3DContext);
  if (context === undefined) {
    throw new Error('useMode3D must be used within a Mode3DProvider');
  }
  return context;
};

export const Mode3DProvider = ({ children }: { children: ReactNode }) => {
  // Lazy initializer (not an effect) so the very first render already reflects a
  // previously saved choice -- matters here more than it would for theme, since a screen
  // that later reacts to this mounting a <Canvas> shouldn't flash 2D-then-3D on load.
  const [enabled, setEnabledState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      // Private-browsing / storage-blocked contexts can throw on read -- default to off
      // (the safer, cheaper default) rather than letting this crash the provider.
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      // Same as above -- a blocked/full storage just means the choice won't survive a
      // reload, not a reason to break the toggle for this session.
    }
  }, [enabled]);

  const setEnabled = (next: boolean) => setEnabledState(next);

  return (
    <Mode3DContext.Provider value={{ enabled, setEnabled }}>
      {children}
    </Mode3DContext.Provider>
  );
};
