import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';

export default function SettingsDialog({ open, onClose, onError }) {
  const { user, updateSettings } = useAuth();
  const { mode, setMode } = useThemeMode();
  const [name, setName] = useState(user?.name || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setName(user?.name || '');
  }, [open, user?.name]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await updateSettings({ name: name.trim() });
      onClose();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleTheme(checked) {
    const next = checked ? 'dark' : 'light';
    setMode(next);
    try {
      await updateSettings({ theme: next });
    } catch (err) {
      onError(err.message);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={save}>
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            value={name}
            onChange={(event) => setName(event.target.value)}
            inputProps={{ maxLength: 80 }}
            sx={{ mt: 1 }}
          />
          <TextField label="Email" fullWidth value={user?.email || ''} disabled sx={{ mt: 2 }} />
          <FormControlLabel
            sx={{ mt: 2, mx: 0, display: 'flex', justifyContent: 'space-between' }}
            labelPlacement="start"
            control={<Switch checked={mode === 'dark'} onChange={(event) => toggleTheme(event.target.checked)} />}
            label="Dark mode"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy || !name.trim()}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
