import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  CircularProgress,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Skeleton,
} from "@mui/material";

import { useNavigate } from "react-router-dom";

import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import authService from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

export default function Profile() {
  const { user, setUser } = useAuth();

  // const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openLogout, setOpenLogout] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const result = await authService.getMe(token);
      console.log("PROFILE DATA:", result.user);
      console.log("PHOTO VALUE:", result.user?.photo);
      setUser(result.user);
    } catch (err) {
      console.error(err);

      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box p={2}>
        <Card sx={{ borderRadius: 4 }}>
          <CardContent>
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
            >
              <Skeleton
                variant="circular"
                width={90}
                height={90}
                sx={{
                  mx: "auto",
                }}
              />

              <Skeleton width={180} height={40} sx={{ mx: "auto" }} />

              <Skeleton width={120} height={30} sx={{ mx: "auto" }} />
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{
            mt: 2,
            borderRadius: 4,
          }}
        >
          <CardContent>
            {[1, 2, 3, 4].map((i) => (
              <Box key={i} mb={2}>
                <Skeleton width={80} />

                <Skeleton width="100%" height={30} />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="70vh"
      >
        <Typography color="error">Profile not found.</Typography>
      </Box>
    );
  }

  const handleLogout = async () => {
    try {
      // Minta backend menghapus sesi aktif employee
      const token = localStorage.getItem("token");

      if (token) {
        await authService.logout(token);
      }
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      // Tetap logout lokal meskipun API gagal
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);

      // Tutup dialog dan kembali ke login
      setOpenLogout(false);
      window.location.replace("/");
    }
  };
  return (
    <Box sx={{ p: 2 }}>
      <Card
        sx={{
          borderRadius: 1,
          overflow: "hidden",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "stretch",
              gap: 1.5,
            }}
          >
            {/* FOTO PROFIL */}
            <Avatar
              src={user?.photo_url || ""}
              alt={user?.name || "Profile"}
              variant="rounded"
              sx={{
                width: 125,
                minWidth: 125,
                height: 215,
                borderRadius: 1.5,
                fontSize: 36,
                bgcolor: "primary.main",
                "& img": {
                  objectFit: "cover",
                },
              }}
            >
              {user?.name?.charAt(0)}
            </Avatar>

            {/* INFORMASI PROFIL */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 0.65,
                py: 0.3,
              }}
            >
              <Typography
                fontSize={16}
                lineHeight={1.2}
                sx={{
                  fontSize: 16,
                  fontWeight: "bold !important",
                  fontFamily: "Arial, sans-serif",
                }}
              >
                {user?.name || "-"}
              </Typography>

              {[
                { label: "NIK", value: user?.nik },
                { label: "Department", value: user?.department },
                { label: "Email", value: user?.email },
                { label: "Job Level", value: user?.position },
                { label: "NIP", value: user?.nip },
              ].map((item) => (
                <Box key={item.label}>
                  <Typography
                    sx={{
                      fontSize: 10,
                      color: "text.secondary",
                      lineHeight: 1.3,
                    }}
                  >
                    {item.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      fontWeight: 500,
                      lineHeight: 1.35,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {item.value || "-"}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card
        sx={{
          mt: 2,
          borderRadius: 1,
        }}
      >
        <List disablePadding>
          {/* EDIT PROFILE */}
          <ListItemButton onClick={() => navigate("/employee/edit-profile")}>
            <ListItemIcon>
              <EditOutlinedIcon color="primary" />
            </ListItemIcon>

            <ListItemText
              primary="Edit Profile"
              secondary="Update your personal information"
            />

            <ChevronRightRoundedIcon color="action" />
          </ListItemButton>

          <Divider />
          {/* TENTANG PERUSAHAAN */}
          <ListItemButton onClick={() => navigate("/employee/about-company")}>
            <ListItemIcon>
              <BusinessOutlinedIcon color="primary" />
            </ListItemIcon>

            <ListItemText
              primary="About Company"
              secondary="Information and profile of the company"
            />

            <ChevronRightRoundedIcon color="action" />
          </ListItemButton>

          <Divider />

          {/* BANTUAN & DUKUNGAN */}
          <ListItemButton>
            <ListItemIcon>
              <SupportAgentOutlinedIcon color="primary" />
            </ListItemIcon>

            <ListItemText
              primary="Help & Support"
              secondary="Guides and assistance for using the application"
            />

            <ChevronRightRoundedIcon color="action" />
          </ListItemButton>

          <Divider />

          {/* CHANGE PASSWORD */}
          <ListItemButton onClick={() => navigate("/forgot-password")}>
            <ListItemIcon>
              <LockOutlinedIcon color="primary" />
            </ListItemIcon>

            <ListItemText
              primary="Change Password"
              secondary="Update your account password"
            />

            <ChevronRightRoundedIcon color="action" />
          </ListItemButton>

          <Divider />

          {/* LOG OUT */}
          <ListItemButton
            onClick={() => setOpenLogout(true)}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon>
              <LogoutRoundedIcon color="error" />
            </ListItemIcon>

            <ListItemText primary="Log Out" secondary="Sign out of the app" />

            <ChevronRightRoundedIcon color="error" />
          </ListItemButton>
        </List>
      </Card>
      <Dialog open={openLogout} onClose={() => setOpenLogout(false)}>
        <DialogTitle>Logout</DialogTitle>

        <DialogContent>Are you sure you want to log out?</DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenLogout(false)}>Cancel</Button>

          <Button color="error" variant="contained" onClick={handleLogout}>
            Logout
          </Button>
        </DialogActions>
      </Dialog>
      <Box
        sx={{
          mt: 4,
          mb: 2,
          textAlign: "center",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          ©{new Date().getFullYear()} PRIDE. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}
