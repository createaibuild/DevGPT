import { createTheme } from '@mui/material/styles';

export function buildTheme(mode) {
  const dark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: { main: '#10a37f', contrastText: '#ffffff' },
      background: {
        default: dark ? '#212121' : '#f6f6f4',
        paper: dark ? '#2a2a2a' : '#ffffff',
      },
      text: {
        primary: dark ? '#ececec' : '#161616',
        secondary: dark ? '#b4b4b4' : '#5f5f5f',
      },
      divider: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: '"Inter", "Segoe UI", sans-serif',
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: 'background-color 0.2s ease, color 0.2s ease',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 10, textTransform: 'none', fontWeight: 600 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 999 },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 16 },
        },
      },
    },
  });
}

export function sidebarColor(mode) {
  return mode === 'dark' ? '#171717' : '#ffffff';
}

export function userBubbleColor(mode) {
  return mode === 'dark' ? '#303030' : '#ececec';
}
