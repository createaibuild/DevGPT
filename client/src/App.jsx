import { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress, CssBaseline, ThemeProvider } from '@mui/material';
import { ThemeModeProvider, useThemeMode } from './context/ThemeModeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { buildTheme } from './theme';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';

function FullPageSpinner() {
  return (
    <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}>
      <CircularProgress />
    </Box>
  );
}

function Guard({ guest = false, children }) {
  const { user, ready } = useAuth();
  if (!ready) return <FullPageSpinner />;
  if (guest && user) return <Navigate to="/" replace />;
  if (!guest && !user) return <Navigate to="/login" replace />;
  return children;
}

function ThemedApp() {
  const { mode } = useThemeMode();
  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Guard guest><Login /></Guard>} />
            <Route path="/register" element={<Guard guest><Register /></Guard>} />
            <Route path="/" element={<Guard><Chat /></Guard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <ThemeModeProvider>
      <ThemedApp />
    </ThemeModeProvider>
  );
}
