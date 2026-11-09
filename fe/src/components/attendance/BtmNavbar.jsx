import { useEffect, useState } from "react";

import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Badge,
} from "@mui/material";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";

import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import notificationService from "../../services/notificationService";

export default function BottomNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [badge, setBadge] = useState(0);

  // =====================================
  // ROLE CHECK
  // =====================================

  const role = String(
    user?.role?.name || user?.role || user?.role_name || "",
  ).toUpperCase();

  const roleId = Number(user?.role_id);

  const isEmployee = [3, 4, 5, 6].includes(roleId);

  const mustEnrollFace = isEmployee && user?.face_enrolled !== true;

  const canApproval =
    ["SUPERVISOR", "MANAGER"].includes(role) || [4, 5].includes(roleId);

  // =====================================
  // MENU
  // =====================================

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

  // =====================================
  // NOTIFICATION BADGE
  // =====================================

  useEffect(() => {
    const loadBadge = async () => {
      try {
        const { data } = await notificationService.getBadge();
        setBadge(data.badge || 0);
      } catch (err) {
        console.error("LOAD NAV BADGE ERROR:", err);
      }
    };

    if (!mustEnrollFace) {
      loadBadge();
    }
  }, [location.pathname, mustEnrollFace]);

  // =====================================
  // HIDE DURING FACE ENROLLMENT
  // =====================================

  if (mustEnrollFace) {
    return null;
  }

  // =====================================
  // RENDER
  // =====================================

  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",

        // Safe area Android / iOS
        bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",

        left: 12,
        right: 12,

        borderRadius: "18px",
        overflow: "hidden",

        zIndex: 1200,
        boxSizing: "border-box",

        backgroundColor: "#ffffff",
        border: "1px solid rgba(229, 231, 235, 0.8)",

        // Hindari navbar ikut bergeser saat keyboard muncul
        "@media (max-height: 450px)": {
          bottom: "8px",
        },
      }}
    >
      <BottomNavigation
        value={location.pathname}
        onChange={(event, newValue) => {
          navigate(newValue);
        }}
        showLabels
        sx={{
          height: 68,
          bgcolor: "#ffffff",

          "& .MuiBottomNavigationAction-root": {
            color: "#9CA3AF",
            transition: ".25s",
            minWidth: 0,
            paddingLeft: 0.5,
            paddingRight: 0.5,
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
          const showBadge =
            (canApproval && item.value === "/employee/approval") ||
            (role === "EMPLOYEE" && item.value === "/employee/leave");

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
