import { Box } from "@mui/material";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import useAdminIdleLogout from "../hooks/useAdminIdleLogout";

export default function DashboardLayout({ children, title, subtitle }) {
  useAdminIdleLogout();

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        minHeight: "100vh",
        overflowX: "clip",
      }}
    >
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          flex: 1,
          minWidth: 0,
          bgcolor: "#F5F7FA",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* HEADER */}
        <Header title={title} subtitle={subtitle} />

        {/* PAGE CONTENT */}
        <Box
          sx={{
            width: "100%",
            maxWidth: "none",
            boxSizing: "border-box",
            flexGrow: 1,
            px: {
              xs: 2,
              sm: 2.5,
              md: 3,
              lg: 4,
            },
            py: {
              xs: 2,
              md: 3,
            },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
