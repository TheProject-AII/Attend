import { useState } from "react";
import { Box } from "@mui/material";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import useAdminIdleLogout from "../hooks/useAdminIdleLogout";

export default function DashboardLayout({ children, title, subtitle }) {
  useAdminIdleLogout();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", width: "100%", minHeight: "100vh", overflowX: "hidden" }}>
      <Sidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: "100%",
          ml: 0,
          pt: { xs: "76px", sm: "84px", md: "100px" },
          bgcolor: "#F5F7FA",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          overflowX: "hidden",
        }}
      >
        <Header title={title} subtitle={subtitle} onMenuClick={() => setMobileMenuOpen(true)} />
        <Box
          sx={{
            width: "100%",
            maxWidth: "none",
            minWidth: 0,
            boxSizing: "border-box",
            flexGrow: 1,
            px: { xs: 1.25, sm: 2, md: 3, lg: 3 },
            py: { xs: 1.5, md: 2.5 },
            overflowX: "hidden",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
