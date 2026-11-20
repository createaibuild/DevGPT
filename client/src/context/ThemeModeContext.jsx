import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ThemeModeContext = createContext(null);

function storedMode() {
  const saved = localStorage.getItem('theme');
  return saved === 'light' || saved === 'dark' ? saved : 'dark';
}

export function ThemeModeProvider({ children }) {
  const [mode, setModeState] = useState(storedMode);

  const setMode = useCallback((next) => {
    localStorage.setItem('theme', next);
    setModeState(next);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return context;
}
