import { Box } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";
import BottomNavigationBar from "../components/attendance/BtmNavbar";

export default function AbsensiLayout() {
  const location = useLocation();

  const isFaceEnrollment = location.pathname === "/employee/face-enrollment";

  return (
    <Box
      sx={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#F5F7FA",
        overflow: "hidden",
        overscrollBehavior: "none",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehaviorY: "none",
          WebkitOverflowScrolling: "touch",
          bgcolor: "#F5F7FA",
          pb: isFaceEnrollment ? 0 : 10,
        }}
      >
        <Outlet />
      </Box>

      {!isFaceEnrollment && <BottomNavigationBar />}
    </Box>
  );
}
