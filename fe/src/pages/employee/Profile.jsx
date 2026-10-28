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
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import authService from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

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
          borderRadius: 2,
        }}
      >
        <CardContent
          sx={{
            textAlign: "center",
          }}
        >
          <Avatar
            src={user?.photo || ""}
            sx={{
              width: 90,
              height: 90,
              boxShadow: "0 8px 25px rgba(22,163,74,.25)",
              mx: "auto",
              mb: 2,
              bgcolor: "#16A34A",
              fontSize: 34,
            }}
          >
            {user?.name?.charAt(0)}
          </Avatar>

          <Typography variant="h5" fontWeight={700}>
            {user.name}
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {user.position}
          </Typography>

          <Chip
            label={user.department}
            color="success"
            size="small"
            sx={{
              mt: 2,
              px: 1,
            }}
          />
        </CardContent>
      </Card>
      <Card
        sx={{
          mt: 2,
          borderRadius: 2,
        }}
      >
        <CardContent>
          <Box py={1}>
            <Typography variant="caption" color="text.secondary">
              NIK
            </Typography>

            <Typography variant="body1" fontWeight={600} mt={0.5}>
              {user.nik}
            </Typography>
          </Box>

          <Divider />

          <Box py={2}>
            <Typography variant="caption" color="text.secondary">
              Email
            </Typography>

            <Typography
              variant="body1"
              fontWeight={600}
              mt={0.5}
              sx={{
                wordBreak: "break-word",
              }}
            >
              {user.email}
            </Typography>
          </Box>

          <Divider />

          <Box py={2}>
            <Typography variant="caption" color="text.secondary">
              Department
            </Typography>

            <Typography variant="body1" fontWeight={600} mt={0.5}>
              {user.department}
            </Typography>
          </Box>

          <Divider />

          <Box py={2}>
            <Typography variant="caption" color="text.secondary">
              Position
            </Typography>

            <Typography variant="body1" fontWeight={600} mt={0.5}>
              {user.position}
            </Typography>
          </Box>
        </CardContent>
      </Card>
      <Card
        sx={{
          mt: 2,
          borderRadius: 2,
        }}
      >
        <List disablePadding>
          <ListItemButton onClick={() => navigate("/overtime")}>
            <ListItemIcon>
              <AccessTimeRoundedIcon color="primary" />
            </ListItemIcon>

            <ListItemText
              primary="Overtime Summary"
              secondary="View overtime history and payments"
            />

            <ChevronRightRoundedIcon color="action" />
          </ListItemButton>
          <Divider />
          <ListItemButton>
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

          <ListItemButton
            onClick={() => setOpenLogout(true)}
            sx={{
              color: "error.main",
            }}
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
        <Typography variant="body2" fontWeight={600} color="text.secondary">
          Emp-Attendance
        </Typography>

        <Typography variant="caption" color="text.secondary">
          Version 1.0.0
        </Typography>
      </Box>
    </Box>
  );
}
