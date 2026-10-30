import { useState } from "react";

import {
  Avatar,
  Badge,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  Button,
  Menu,
  MenuItem,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PasswordRoundedIcon from "@mui/icons-material/PasswordRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import LanguageIcon from "@mui/icons-material/Language";
import authService from "../services/authService";

export default function Header({ title = "Dashboard", subtitle }) {
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [profileAnchor, setProfileAnchor] = useState(null);
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const { user, setUser } = useAuth();
  const [hrgaLeader, setHrgaLeader] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const { t, i18n } = useTranslation();
  const [languageAnchor, setLanguageAnchor] = useState(null);

  // Fungsi untuk mengubah password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const changeLanguage = async (language) => {
    await i18n.changeLanguage(language);
    localStorage.setItem("aii_language", language);
    setLanguageAnchor(null);
  };
  const notifications = [
    "New leave request",
    "3 employees have not checked in",
    "1 overtime request",
  ];

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "?";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);

    // Paksa reload ke login
    window.location.replace("/");
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Semua kolom password wajib diisi.");
      return;
    }

    if (newPassword.length < 8) {
      alert("Password baru minimal 8 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Konfirmasi password tidak sama.");
      return;
    }

    try {
      setChangingPassword(true);

      const response = await authService.changePassword(
        currentPassword,
        newPassword,
        confirmPassword,
      );

      alert(response.message || "Password berhasil diubah.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordOpen(false);
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Gagal mengubah password. Silakan coba lagi.",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleOpenProfile = async () => {
    setProfileOpen(true);
    setLoadingProfile(true);

    try {
      const response = await authService.getHRGALeader();
      setHrgaLeader(response.data);
    } catch (error) {
      console.error("GET HRGA LEADER ERROR:", error);
      alert(
        error.response?.data?.message || "Gagal mengambil data profil HRGA.",
      );
    } finally {
      setLoadingProfile(false);
    }
  };
  return (
    <>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1200,

          height: 80,

          px: 4,

          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",

          bgcolor: "rgba(255,255,255,.95)",
          backdropFilter: "blur(10px)",

          borderBottom: "1px solid #E5E7EB",

          transition: ".25s",
        }}
      >
        {/* LEFT */}
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {title}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {subtitle || `Welcome, ${user?.name} 👋`}
          </Typography>
        </Box>
        {/* RIGHT */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          {/* NOTIFICATION */}
          <IconButton onClick={(e) => setNotifAnchor(e.currentTarget)}>
            <Badge badgeContent={notifications.length} color="error">
              <NotificationsNoneRoundedIcon />
            </Badge>
          </IconButton>

          {/* PROFILE */}
          <Box
            onClick={(e) => setProfileAnchor(e.currentTarget)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 1.5,
              py: 1,
              borderRadius: 3,
              cursor: "pointer",
              "&:hover": {
                bgcolor: "#F3F4F6",
              },
            }}
          >
            <Avatar
              sx={{
                width: 42,
                height: 42,
                bgcolor: "#0F766E",
              }}
            >
              {initial}
            </Avatar>

            <Box>
              <Typography
                sx={{
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                {user?.name}
              </Typography>

              <Typography variant="caption" color="text.secondary">
                {user?.role}
              </Typography>
            </Box>

            <KeyboardArrowDownRoundedIcon
              sx={{
                color: "#9CA3AF",
              }}
            />
          </Box>
          <>
            <Button
              startIcon={<LanguageIcon />}
              onClick={(event) => setLanguageAnchor(event.currentTarget)}
              sx={{ textTransform: "none" }}
            >
              {i18n.language === "id" ? "Bahasa" : "English"}
            </Button>

            <Menu
              anchorEl={languageAnchor}
              open={Boolean(languageAnchor)}
              onClose={() => setLanguageAnchor(null)}
            >
              <MenuItem onClick={() => changeLanguage("id")}>
                🇮🇩 Bahasa Indonesia
              </MenuItem>

              <MenuItem onClick={() => changeLanguage("en")}>
                🇬🇧 English
              </MenuItem>
            </Menu>
          </>
        </Box>
      </Box>

      {/* ========================= */}
      {/* NOTIFICATION MENU */}
      {/* ========================= */}

      <Menu
        anchorEl={notifAnchor}
        open={Boolean(notifAnchor)}
        onClose={() => setNotifAnchor(null)}
        PaperProps={{
          sx: {
            width: 280,
            borderRadius: 3,
          },
        }}
      >
        <Typography px={2} py={1.5} fontWeight={700}>
          Notifications
        </Typography>

        <Divider />

        {notifications.map((item, index) => (
          <MenuItem key={index} onClick={() => setNotifAnchor(null)}>
            {item}
          </MenuItem>
        ))}
      </Menu>

      {/* ========================= */}
      {/* PROFILE MENU */}
      {/* ========================= */}

      <Menu
        anchorEl={profileAnchor}
        open={Boolean(profileAnchor)}
        onClose={() => setProfileAnchor(null)}
        PaperProps={{
          sx: {
            width: 220,
            borderRadius: 3,
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setProfileAnchor(null);
            handleOpenProfile();
          }}
        >
          <ListItemIcon>
            <PersonRoundedIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>

        <MenuItem
          onClick={() => {
            setProfileAnchor(null);
            setPasswordOpen(true);
          }}
        >
          <ListItemIcon>
            <PasswordRoundedIcon fontSize="small" />
          </ListItemIcon>
          Change Password
        </MenuItem>
        <Divider />

        <MenuItem
          onClick={handleLogout}
          sx={{
            color: "error.main",
          }}
        >
          <ListItemIcon>
            <LogoutRoundedIcon color="error" fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      {/* PROFILE DIALOG */}
      <Dialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: "hidden",
          },
        }}
      >
        {loadingProfile ? (
          <Box p={4} textAlign="center">
            Loading profile...
          </Box>
        ) : hrgaLeader ? (
          <>
            {/* PROFILE HEADER */}
            <Box
              sx={{
                position: "relative",
                minHeight: 230,
                p: 3,
                display: "flex",
                alignItems: "flex-end",
                gap: 2,
                backgroundImage: `
            linear-gradient(
              to top,
              rgba(15, 23, 42, 0.85),
              rgba(15, 23, 42, 0.15)
            ),
            url("${hrgaLeader.photoUrl || ""}")
          `,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <IconButton
                onClick={() => setProfileOpen(false)}
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  color: "white",
                  bgcolor: "rgba(0,0,0,0.25)",
                }}
              >
                <CloseIcon />
              </IconButton>

              <Avatar
                src={hrgaLeader.photoUrl || undefined}
                sx={{
                  width: 82,
                  height: 82,
                  border: "3px solid white",
                }}
              >
                {hrgaLeader.name?.charAt(0)}
              </Avatar>

              <Box sx={{ color: "white", pb: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  {hrgaLeader.name}
                </Typography>
                <Typography variant="body2">
                  {hrgaLeader.position} - {hrgaLeader.job_level}
                </Typography>
              </Box>
            </Box>

            {/* PROFILE DETAILS */}
            <Box sx={{ p: 3 }}>
              {[
                ["NIK", hrgaLeader.nik],
                ["Email", hrgaLeader.company_email],
                ["Department", hrgaLeader.department],
                ["Role", hrgaLeader.job_level],
                ["Job Level", hrgaLeader.job_level],
              ].map(([label, value]) => (
                <Box
                  key={label}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 1.8,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    gap: 2,
                  }}
                >
                  <Typography color="text.secondary" variant="body2">
                    {label}
                  </Typography>

                  <Typography
                    fontWeight={600}
                    variant="body2"
                    textAlign="right"
                  >
                    {value || "-"}
                  </Typography>
                </Box>
              ))}

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  pt: 2,
                }}
              >
                <Typography color="text.secondary" variant="body2">
                  Status
                </Typography>

                <Badge
                  color={hrgaLeader.status ? "success" : "error"}
                  badgeContent={hrgaLeader.status ? "Active" : "Inactive"}
                  sx={{
                    "& .MuiBadge-badge": {
                      position: "static",
                      transform: "none",
                      borderRadius: 2,
                      px: 1.5,
                      py: 1.5,
                    },
                  }}
                />
              </Box>
            </Box>

            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button
                onClick={() => setProfileOpen(false)}
                variant="outlined"
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                Close
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      {/* CHANGE PASSWORD DIALOG */}
      {/* CHANGE PASSWORD DIALOG */}
      <Dialog
        open={passwordOpen}
        onClose={() => {
          if (!changingPassword) setPasswordOpen(false);
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Change Password</DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Update your account password.
          </Typography>

          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              size="small"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={changingPassword}
            />

            <TextField
              fullWidth
              label="New Password"
              type="password"
              size="small"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={changingPassword}
            />

            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              size="small"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={changingPassword}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setPasswordOpen(false)}
            disabled={changingPassword}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={changingPassword}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            {changingPassword ? "Updating..." : "Update Password"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
