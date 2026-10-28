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
} from "@mui/material";

import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PasswordRoundedIcon from "@mui/icons-material/PasswordRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import LanguageIcon from "@mui/icons-material/Language";

export default function Header({ title = "Dashboard", subtitle }) {
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [profileAnchor, setProfileAnchor] = useState(null);
  const navigate = useNavigate();

  const { user, setUser } = useAuth();

  const { t, i18n } = useTranslation();
  const [languageAnchor, setLanguageAnchor] = useState(null);

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
        <MenuItem>
          <ListItemIcon>
            <PersonRoundedIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>

        <MenuItem>
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
    </>
  );
}
