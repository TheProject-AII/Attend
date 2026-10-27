import React, { useState } from "react";
import { Box, Paper, Tab, Tabs } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";

import MyLateCompensation from "../attendance/MyLateCompensation";
import AttendanceHistory from "../employee/History";

// Ganti import ini sesuai lokasi komponen
// Attendance History yang sudah ada di project lu.
// import AttendanceHistory from "../attendance/Attendance";

export default function EmployeeHistoryPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box
      sx={{
        width: "100%",
        pb: "100px",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: "1px solid #E5E7EB",
          borderRadius: 0,
          bgcolor: "#fff",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          variant="fullWidth"
          textColor="inherit"
          sx={{
            "& .MuiTabs-indicator": {
              bgcolor: "#16A34A",
              height: 3,
            },
            "& .Mui-selected": {
              color: "#16A34A",
            },
          }}
        >
          <Tab
            icon={<HistoryRoundedIcon />}
            iconPosition="start"
            label="Attendance"
          />

          <Tab
            icon={<AccessTimeRoundedIcon />}
            iconPosition="start"
            label="Compensation"
          />
        </Tabs>
      </Paper>

      <Box hidden={activeTab !== 0}>
        {activeTab === 0 && <AttendanceHistory />}
      </Box>

      <Box hidden={activeTab !== 1}>
        {activeTab === 1 && <MyLateCompensation />}
      </Box>
    </Box>
  );
}
