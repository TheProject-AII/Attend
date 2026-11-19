import { useEffect, useState } from "react";
import {
  Avatar, Box, Card, CardContent, Divider, Typography, List,
  ListItemButton, ListItemIcon, ListItemText, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, Skeleton,
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
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import FolderSharedOutlinedIcon from "@mui/icons-material/FolderSharedOutlined";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [openLogout, setOpenLogout] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const result = await authService.getMe(localStorage.getItem("token"));
      setUser(result.user);
    } catch (err) {
      console.error(err);
      setUser(null);
    } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) await authService.logout(token);
    } catch (err) { console.error("Logout API error:", err); }
    finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      setOpenLogout(false);
      window.location.replace("/");
    }
  };

  if (loading) return <Box p={2}><Card sx={{ borderRadius: 4 }}><CardContent><Box display="flex" flexDirection="column" alignItems="center"><Skeleton variant="circular" width={90} height={90} /><Skeleton width={180} height={40} /><Skeleton width={120} height={30} /></Box></CardContent></Card><Card sx={{ mt: 2, borderRadius: 4 }}><CardContent>{[1,2,3,4].map((i) => <Box key={i} mb={2}><Skeleton width={80} /><Skeleton width="100%" height={30} /></Box>)}</CardContent></Card></Box>;
  if (!user) return <Box display="flex" justifyContent="center" alignItems="center" height="70vh"><Typography color="error">Profile not found.</Typography></Box>;

  const menuItem = (icon, title, subtitle, path) => <ListItemButton onClick={() => navigate(path)}><ListItemIcon>{icon}</ListItemIcon><ListItemText primary={title} secondary={subtitle} /><ChevronRightRoundedIcon color="action" /></ListItemButton>;

  return <Box sx={{ p: 2 }}>
    <Card sx={{ borderRadius: 1, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "flex", alignItems: "stretch", gap: 1.5 }}>
          <Avatar src={user?.photo_url || ""} alt={user?.name || "Profile"} variant="rounded" sx={{ width: 125, minWidth: 125, height: 215, borderRadius: 1.5, fontSize: 36, bgcolor: "primary.main", "& img": { objectFit: "cover" } }}>{user?.name?.charAt(0)}</Avatar>
          <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 0.65, py: 0.3 }}>
            <Typography sx={{ fontSize: 16, fontWeight: "bold", fontFamily: "Arial, sans-serif", lineHeight: 1.2 }}>{user?.name || "-"}</Typography>
            {[{ label: "NIK", value: user?.nik }, { label: "Department", value: user?.department }, { label: "Email", value: user?.email }, { label: "Job Level", value: user?.position }, { label: "NIP", value: user?.nip }].map((item) => <Box key={item.label}><Typography sx={{ fontSize: 10, color: "text.secondary", lineHeight: 1.3 }}>{item.label}</Typography><Typography sx={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.35, overflowWrap: "anywhere" }}>{item.value || "-"}</Typography></Box>)}
          </Box>
        </Box>
      </CardContent>
    </Card>

    <Card sx={{ mt: 2, borderRadius: 1 }}>
      <Box sx={{ px: 2, pt: 2, pb: 0.5 }}><Typography fontWeight={800} fontSize={16}>My Data</Typography><Typography variant="caption" color="text.secondary">Manage your employee information</Typography></Box>
      <List disablePadding>
        {menuItem(<EditOutlinedIcon color="primary" />, "Edit Profile", "Update your personal information", "/employee/edit-profile")}
        <Divider />
        {menuItem(<DescriptionRoundedIcon color="primary" />, "Pay Slip", "Request and download your salary slip", "/employee/pay-slip")}
        <Divider />
        {menuItem(<AccountBalanceRoundedIcon color="primary" />, "Account Bank", "View your registered bank account", "/employee/account-bank")}
      </List>
    </Card>

    <Card sx={{ mt: 2, borderRadius: 1 }}><List disablePadding>
      {menuItem(<BusinessOutlinedIcon color="primary" />, "About Company", "Information and profile of the company", "/employee/about-company")}
      <Divider />
      <ListItemButton><ListItemIcon><SupportAgentOutlinedIcon color="primary" /></ListItemIcon><ListItemText primary="Help & Support" secondary="Guides and assistance for using the application" /><ChevronRightRoundedIcon color="action" /></ListItemButton>
      <Divider />
      <ListItemButton onClick={() => navigate("/forgot-password", { state: { fromProfile: true } })}><ListItemIcon><LockOutlinedIcon color="primary" /></ListItemIcon><ListItemText primary="Change Password" secondary="Update your account password" /><ChevronRightRoundedIcon color="action" /></ListItemButton>
      <Divider />
      <ListItemButton onClick={() => setOpenLogout(true)} sx={{ color: "error.main" }}><ListItemIcon><LogoutRoundedIcon color="error" /></ListItemIcon><ListItemText primary="Log Out" secondary="Sign out of the app" /><ChevronRightRoundedIcon color="error" /></ListItemButton>
    </List></Card>

    <Dialog open={openLogout} onClose={() => setOpenLogout(false)}><DialogTitle>Logout</DialogTitle><DialogContent>Are you sure you want to log out?</DialogContent><DialogActions><Button onClick={() => setOpenLogout(false)}>Cancel</Button><Button color="error" variant="contained" onClick={handleLogout}>Logout</Button></DialogActions></Dialog>
    <Box sx={{ mt: 4, mb: 2, textAlign: "center" }}><Typography variant="caption" color="text.secondary">©{new Date().getFullYear()} PRIDE. All rights reserved.</Typography></Box>
  </Box>;
}
