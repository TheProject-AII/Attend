import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import BottomNavigationBar from "../components/attendance/BtmNavbar";

export default function AbsensiLayout() {
    return (
        <Box
            sx={{
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                bgcolor: "#F5F7FA",
            }}
        >
            <Box
                sx={{
                    flex: 1,
                    overflowY: "auto",
                    pb: 10,
                }}
            >
                <Outlet />
            </Box>

            <BottomNavigationBar />
        </Box>
    );
}