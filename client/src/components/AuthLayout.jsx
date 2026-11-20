import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useThemeMode } from '../context/ThemeModeContext';
import Logo from './Logo';

export default function AuthLayout({ title, subtitle, children, footer }) {
  const { mode, setMode } = useThemeMode();
  const nextMode = mode === 'dark' ? 'light' : 'dark';

  return (
    <Box sx={{ minHeight: '100%', display: 'flex', bgcolor: 'background.default' }}>
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: 1.15,
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          color: '#f5f7f6',
          background:
            'radial-gradient(900px 420px at 0% -10%, rgba(16,163,127,0.45), transparent 55%), linear-gradient(165deg, #121816 0%, #18211e 48%, #0e1412 100%)',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Logo />
          <Typography sx={{ fontWeight: 700, fontSize: 20 }}>DevGPT</Typography>
        </Stack>
        <Box>
          <Typography sx={{ fontSize: 42, fontWeight: 650, letterSpacing: '-0.04em', lineHeight: 1.12, maxWidth: 480 }}>
            Think out loud. Keep the thread.
          </Typography>
          <Stack spacing={1.4} sx={{ mt: 4 }}>
            {[
              'Streaming replies, as they are written',
              'Conversations saved to your account',
              'Lists, tables, and images in the answer',
            ].map((item) => (
              <Stack key={item} direction="row" spacing={1.25} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1fbe96', flexShrink: 0 }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.82)' }}>{item}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          A focused ChatGPT-style workspace.
        </Typography>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', px: { xs: 2.5, sm: 4 }, py: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
            <IconButton aria-label="Toggle color theme" onClick={() => setMode(nextMode)}>
              {mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ width: '100%', maxWidth: 420 }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ display: { xs: 'flex', md: 'none' }, mb: 3 }}>
              <Logo />
              <Typography sx={{ fontWeight: 700, fontSize: 18 }}>DevGPT</Typography>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.03em' }}>{title}</Typography>
            <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>{subtitle}</Typography>
            {children}
            <Typography color="text.secondary" sx={{ mt: 3 }}>{footer}</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
