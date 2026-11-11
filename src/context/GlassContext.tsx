import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// The glass effects (translucent, blurred surfaces over what's behind them): a preference like
// the 3D mode (see Mode3DContext.tsx, which this mirrors), kept in localStorage so it's there
// before the session loads. On, it marks <html data-glass>: the surfaces made of glass (the
// global .glass class) take it then, and only then (see globals.css). On by default: off only
// once turned off.
const STORAGE_KEY = 'glass';

interface GlassContextType {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const GlassContext = createContext<GlassContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useGlass = (): GlassContextType => {
  const context = useContext(GlassContext);
  if (context === undefined) {
    throw new Error('useGlass must be used within a GlassProvider');
  }
  return context;
};

const readSaved = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '0';
  } catch {
    // Storage blocked (private browsing): the default, on.
    return true;
  }
};

export const GlassProvider = ({ children }: { children: ReactNode }) => {
  // Read at once (not in an effect), so the first paint is already as chosen.
  const [enabled, setEnabled] = useState<boolean>(readSaved);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-glass', enabled);
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      // A blocked storage: the choice just won't survive a reload.
    }
  }, [enabled]);

  return (
    <GlassContext.Provider value={{ enabled, setEnabled }}>
      {children}
    </GlassContext.Provider>
  );
};
