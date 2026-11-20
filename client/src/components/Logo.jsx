import { Box } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

export default function Logo({ size = 36 }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: `${Math.round(size * 0.28)}px`,
        display: 'grid',
        placeItems: 'center',
        color: '#fff',
        flexShrink: 0,
        background: 'linear-gradient(160deg, #1fbe96 0%, #0d8f6e 100%)',
        boxShadow: '0 8px 18px rgba(16, 163, 127, 0.28)',
      }}
    >
      <AutoAwesomeIcon sx={{ fontSize: size * 0.52 }} />
    </Box>
  );
}
