import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Badge from "@mui/material/Badge";
import { useEffect, useState } from "react";
import notificationService from "../../services/notificationService";

export default function BottomNav() {
  const { user } = useAuth();
  console.log("=== DEBUG MANAGER NAV ===");
  console.log("USER:", user);
  console.log("ROLE:", user?.role);
  console.log("ROLE ID:", user?.role_id);
  console.log("ROLE NAME:", user?.role_name);
  const navigate = useNavigate();
  const location = useLocation();
  const role = String(
    user?.role?.name || user?.role || user?.role_name || "",
  ).toUpperCase();

  const roleId = Number(user?.role_id);
  const isEmployee =
    roleId === 3 || roleId === 4 || roleId === 5 || roleId === 6;

  // Employee wajib menyelesaikan face enrollment terlebih dahulu.
  const mustEnrollFace = isEmployee && user?.face_enrolled !== true;

  // Sembunyikan Bottom Navigation selama enrollment belum selesai.
  if (mustEnrollFace) {
    return null;
  }
  const canApproval =
    ["SUPERVISOR", "MANAGER"].includes(role) || [4, 5].includes(roleId);
  const [badge, setBadge] = useState(0);
  const menus = [
    {
      label: "Attendance",
      value: "/employee/attendance",
      icon: <AccessTimeRoundedIcon />,
    },
    {
      label: "History",
      value: "/employee/history",
      icon: <HistoryRoundedIcon />,
    },
    {
      label: "Request",
      value: "/employee/leave",
      icon: <DescriptionRoundedIcon />,
    },
  ];
  if (canApproval) {
    menus.push({
      label: "Approval",
      value: "/employee/approval",
      icon: <FactCheckRoundedIcon />,
    });
  }
  menus.push({
    label: "Profile",
    value: "/employee/profile",
    icon: <PersonRoundedIcon />,
  });
  useEffect(() => {
    loadBadge();
  }, [location.pathname]);

  const loadBadge = async () => {
    try {
      const { data } = await notificationService.getBadge();

      setBadge(data.badge);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        bottom: 12,
        left: 12,
        right: 12,
        borderRadius: "18px",
        overflow: "hidden",
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <BottomNavigation
        value={location.pathname}
        onChange={(e, newValue) => navigate(newValue)}
        showLabels
        sx={{
          height: 68,
          bgcolor: "#ffffff",

          "& .MuiBottomNavigationAction-root": {
            color: "#9CA3AF",
            transition: ".25s",
            minWidth: 0,
          },

          "& .MuiBottomNavigationAction-label": {
            fontSize: 12,
            fontWeight: 600,
          },

          "& .Mui-selected": {
            color: "#0d439a",
          },

          "& .MuiSvgIcon-root": {
            fontSize: 28,
          },
        }}
      >
        {menus.map((item) => {
          const currentRole = String(
            user?.role?.name || user?.role || user?.role_name || "",
          ).toUpperCase();

          const currentRoleId = Number(user?.role_id);

          const isLeader =
            ["SUPERVISOR", "MANAGER"].includes(currentRole) ||
            [4, 5].includes(currentRoleId);

          const showBadge =
            (isLeader && item.value === "/employee/approval") ||
            (currentRole === "EMPLOYEE" && item.value === "/employee/leave");

          return (
            <BottomNavigationAction
              key={item.value}
              value={item.value}
              label={item.label}
              icon={
                showBadge ? (
                  <Badge
                    badgeContent={badge > 99 ? "99+" : badge}
                    color="error"
                    invisible={badge === 0}
                  >
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )
              }
            />
          );
        })}
      </BottomNavigation>
    </Paper>
  );
}
