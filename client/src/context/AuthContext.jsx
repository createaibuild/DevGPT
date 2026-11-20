import { createContext, useContext, useEffect, useState } from 'react';
import * as api from '../api';
import { useThemeMode } from './ThemeModeContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { mode, setMode } = useThemeMode();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  useEffect(() => {
    let live = true;
    if (!api.getToken()) {
      setReady(true);
      return undefined;
    }

    api.me()
      .then((nextUser) => {
        if (!live) return;
        setUser(nextUser);
        if (nextUser.settings?.theme) setMode(nextUser.settings.theme);
      })
      .catch(() => api.setToken(null))
      .finally(() => {
        if (live) setReady(true);
      });

    return () => {
      live = false;
    };
  }, [setMode]);

  async function login(email, password) {
    const data = await api.login(email, password);
    api.setToken(data.token);
    setUser(data.user);
    if (data.user.settings?.theme) setMode(data.user.settings.theme);
  }

  async function register(name, email, password) {
    const data = await api.register(name, email, password, mode);
    api.setToken(data.token);
    setUser(data.user);
    if (data.user.settings?.theme) setMode(data.user.settings.theme);
  }

  function logout() {
    api.setToken(null);
    setUser(null);
  }

  async function updateSettings(patch) {
    const data = await api.updateMe(patch);
    setUser(data.user);
    if (data.user.settings?.theme) setMode(data.user.settings.theme);
    return data.user;
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, updateSettings }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
