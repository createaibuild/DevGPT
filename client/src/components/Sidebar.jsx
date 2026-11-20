import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { sidebarColor } from '../theme';
import Logo from './Logo';

function initials(name = '') {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase() || '').join('');
  return letters || 'U';
}

function SidebarBody({
  conversations,
  activeId,
  user,
  onNew,
  onSelect,
  onRename,
  onDelete,
  onSettings,
  onLogout,
  onNavigate,
}) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuChat, setMenuChat] = useState(null);

  function closeMenu() {
    setMenuAnchor(null);
    setMenuChat(null);
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: (theme) => sidebarColor(theme.palette.mode),
        color: 'text.primary',
      }}
    >
      <Box sx={{ p: 2, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 0.5, mb: 2 }}>
          <Logo size={34} />
          <Typography sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>DevGPT</Typography>
        </Box>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            onNew();
            onNavigate?.();
          }}
          sx={{
            justifyContent: 'flex-start',
            borderRadius: 2.5,
            py: 1,
            color: 'text.primary',
            borderColor: 'divider',
          }}
        >
          New chat
        </Button>
      </Box>

      <Box component="nav" aria-label="Conversations" sx={{ flex: 1, overflowY: 'auto', px: 1.25, pb: 1 }}>
        {conversations.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2 }}>
            No conversations yet.
          </Typography>
        ) : (
          <List disablePadding>
            {conversations.map((chat) => (
              <ListItemButton
                key={chat.id}
                selected={chat.id === activeId}
                onClick={() => {
                  onSelect(chat.id);
                  onNavigate?.();
                }}
                sx={{
                  borderRadius: 2,
                  mb: 0.25,
                  pr: 0.75,
                  '& .more': { opacity: { xs: 1, md: 0 } },
                  '&:hover .more, &.Mui-selected .more': { opacity: 1 },
                }}
              >
                <ListItemText
                  primary={chat.title}
                  slotProps={{ primary: { noWrap: true, sx: { fontSize: 14, fontWeight: 500 } } }}
                />
                <IconButton
                  className="more"
                  size="small"
                  aria-label={`Actions for ${chat.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuAnchor(event.currentTarget);
                    setMenuChat(chat);
                  }}
                >
                  <MoreHorizIcon fontSize="small" />
                </IconButton>
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={() => { onRename(menuChat); closeMenu(); }}>Rename</MenuItem>
        <MenuItem onClick={() => { onDelete(menuChat); closeMenu(); }} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>

      <Box sx={{ px: 1.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}>
          {initials(user?.name)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 14, fontWeight: 650 }}>{user?.name}</Typography>
          <Typography noWrap variant="caption" color="text.secondary">{user?.email}</Typography>
        </Box>
        <Tooltip title="Settings">
          <IconButton aria-label="Settings" onClick={onSettings}>
            <SettingsOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Log out">
          <IconButton aria-label="Log out" onClick={onLogout}>
            <LogoutOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

export default function Sidebar(props) {
  const { mobileOpen, onClose } = props;
  const paperSx = {
    width: 280,
    boxSizing: 'border-box',
    borderRight: '1px solid',
    borderColor: 'divider',
    bgcolor: (theme) => sidebarColor(theme.palette.mode),
  };

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': paperSx,
        }}
      >
        <SidebarBody {...props} onNavigate={onClose} />
      </Drawer>
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          width: 280,
          flexShrink: 0,
          borderRight: '1px solid',
          borderColor: 'divider',
        }}
      >
        <SidebarBody {...props} />
      </Box>
    </>
  );
}
