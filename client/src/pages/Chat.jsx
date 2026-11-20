import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeModeContext";
import { useChat } from "../hooks/useChat";
import Sidebar from "../components/Sidebar";
import MessageList from "../components/MessageList";
import Composer from "../components/Composer";
import SettingsDialog from "../components/SettingsDialog";

export default function Chat() {
  const { user, logout, updateSettings } = useAuth();
  const { mode, setMode } = useThemeMode();
  const chat = useChat();
  const [navOpen, setNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  const greeting = user?.name?.trim().split(/\s+/)[0] || "";

  async function toggleTheme() {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    try {
      await updateSettings({ theme: next });
    } catch (err) {
      chat.setSnack(err.message);
    }
  }

  async function confirmRename() {
    const title = renameValue.trim();
    if (!title || !renameTarget) return;
    setDialogBusy(true);
    try {
      await chat.renameConversation(renameTarget.id, title);
      setRenameTarget(null);
    } catch (err) {
      chat.setSnack(err.message);
    } finally {
      setDialogBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDialogBusy(true);
    try {
      await chat.deleteConversation(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      chat.setSnack(err.message);
    } finally {
      setDialogBusy(false);
    }
  }

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        overflow: "hidden",
        bgcolor: "background.default",
      }}
    >
      <Sidebar
        conversations={chat.conversations}
        activeId={chat.activeId}
        user={user}
        mobileOpen={navOpen}
        onClose={() => setNavOpen(false)}
        onNew={chat.newChat}
        onSelect={chat.selectConversation}
        onRename={(item) => {
          setRenameTarget(item);
          setRenameValue(item.title);
        }}
        onDelete={setDeleteTarget}
        onSettings={() => setSettingsOpen(true)}
        onLogout={logout}
      />

      <Box
        sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}
      >
        <Box
          component="header"
          sx={{
            height: 64,
            px: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <IconButton
            aria-label="Open conversations"
            onClick={() => setNavOpen(true)}
            sx={{ display: { md: "none" } }}
          >
            <MenuRoundedIcon />
          </IconButton>
          <Typography noWrap sx={{ fontWeight: 650, minWidth: 0, flex: 1 }}>
            {chat.activeId ? chat.activeTitle : "New chat"}
          </Typography>
          {chat.aiMode === "demo" && (
            <Chip
              label="Demo"
              size="small"
              variant="outlined"
              sx={{ height: 26 }}
            />
          )}
          <Tooltip title={mode === "dark" ? "Light mode" : "Dark mode"}>
            <IconButton aria-label="Toggle color theme" onClick={toggleTheme}>
              {mode === "dark" ? (
                <LightModeOutlinedIcon />
              ) : (
                <DarkModeOutlinedIcon />
              )}
            </IconButton>
          </Tooltip>
        </Box>

        <MessageList
          messages={chat.messages}
          streaming={chat.streaming}
          loading={chat.loadingChat}
          greeting={greeting}
          onSuggest={chat.send}
          onAction={chat.send}
        />

        <Box
          sx={{
            px: { xs: 1.5, sm: 2 },
            pb: "calc(16px + env(safe-area-inset-bottom))",
          }}
        >
          <Box sx={{ maxWidth: 820, mx: "auto" }}>
            <Composer
              streaming={chat.streaming}
              onSend={chat.send}
              onStop={chat.stop}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", textAlign: "center", mt: 1.1 }}
            >
              {chat.aiMode === "demo"
                ? "Demo mode is on until you add a Groq API key."
                : "DevGPT can be wrong. Double-check anything important."}
            </Typography>
          </Box>
        </Box>
      </Box>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onError={chat.setSnack}
      />

      <Dialog
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Rename chat</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Title"
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            inputProps={{ maxLength: 80 }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRenameTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={confirmRename}
            disabled={dialogBusy || !renameValue.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete this chat?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            “{deleteTarget?.title}” and its messages will be removed from your
            account.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={dialogBusy}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(chat.snack)}
        autoHideDuration={4000}
        onClose={() => chat.setSnack("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => chat.setSnack("")}
          sx={{ width: "100%" }}
        >
          {chat.snack}
        </Alert>
      </Snackbar>
    </Box>
  );
}
