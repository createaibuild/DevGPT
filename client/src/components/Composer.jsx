import { useState } from 'react';
import { Box, IconButton, TextField } from '@mui/material';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';

export default function Composer({ streaming, onSend, onStop }) {
  const [value, setValue] = useState('');

  async function submit() {
    const text = value;
    if (!text.trim() || streaming) return;
    setValue('');
    const ok = await onSend(text);
    if (!ok) setValue(text);
  }

  function onKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!streaming) submit();
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 1,
        px: 1.75,
        py: 1,
        borderRadius: 7,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: (theme) => (
          theme.palette.mode === 'dark'
            ? '0 12px 32px rgba(0,0,0,0.28)'
            : '0 10px 30px rgba(20,20,20,0.06)'
        ),
      }}
    >
      <TextField
        fullWidth
        multiline
        maxRows={8}
        placeholder="Message DevGPT"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        variant="standard"
        InputProps={{ disableUnderline: true }}
        inputProps={{ 'aria-label': 'Message', style: { fontSize: 16, lineHeight: 1.5 } }}
      />
      <IconButton
        aria-label={streaming ? 'Stop reply' : 'Send message'}
        onClick={streaming ? onStop : submit}
        disabled={!streaming && !value.trim()}
        sx={{
          mb: 0.25,
          width: 36,
          height: 36,
          bgcolor: 'text.primary',
          color: 'background.default',
          '&:hover': { bgcolor: 'text.primary', opacity: 0.88 },
          '&.Mui-disabled': {
            bgcolor: 'action.disabledBackground',
            color: 'text.disabled',
          },
        }}
      >
        {streaming ? <StopRoundedIcon fontSize="small" /> : <ArrowUpwardRoundedIcon fontSize="small" />}
      </IconButton>
    </Box>
  );
}
