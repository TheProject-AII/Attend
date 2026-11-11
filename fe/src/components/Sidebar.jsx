import {
  Drawer,
  Toolbar,
  Typography,
  List,
  ListSubheader,
  Divider,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
} from "@mui/material";

import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import menu from "../config/menu";

const drawerWidth = 250;

const sections = [
  { key: "overview", label: "Overview" },
  { key: "management", label: "Monitoring" },
  { key: "reports", label: "Reports" },
  { key: "system", label: "System" },
];

export default function Sidebar() {
  const { t } = useTranslation();

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const roleId = Number(user?.role_id);
  const role = String(user?.role || "")
    .trim()
    .toUpperCase();

  const isFinance = roleId === 6 || role === "FINANCE";
  const isDirector = roleId === 7 || role === "DIRECTOR";

  let visibleMenu = menu;

  // FINANCE: hanya Payroll dan Payroll Details.
  if (isFinance) {
    visibleMenu = menu.filter((item) =>
      ["/payroll", "/payroll/details"].includes(item.path),
    );
  }

  // DIRECTOR: hanya menu Payroll Approval.
  if (isDirector) {
    visibleMenu = menu
      .filter((item) => item.path === "/payroll/details")
      .map((item) => ({
        ...item,
        title: "Payroll Approval",
        translationKey: "menu.payrollApproval",
      }));
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          borderRight: "1px solid #eee",
          overflowY: "auto",
        },
      }}
    >
      {/* LOGO */}
      <Toolbar
        sx={{
          minHeight: "100px !important",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          px: 2,
        }}
      >
        <Box
          component="img"
          src="/icon/pride_dsb.png"
          alt="HRIS Logo"
          sx={{
            width: "100%",
            maxWidth: 210,
            height: 85,
            objectFit: "contain",
          }}
        />
      </Toolbar>

      {/* MENU BY SECTION */}
      <Box sx={{ px: 1, pb: 3 }}>
        {sections.map((section, index) => {
          const sectionMenus = visibleMenu.filter(
            (item) => item.section === section.key,
          );

          if (sectionMenus.length === 0) return null;

          return (
            <Box key={section.key}>
              {index > 0 && <Divider sx={{ my: 1.5, mx: 1 }} />}

              <List
                subheader={
                  <ListSubheader
                    disableSticky
                    sx={{
                      bgcolor: "transparent",
                      color: "#94A3B8",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 1,
                      lineHeight: "32px",
                    }}
                  >
                    {t(`section.${section.key}`, {
                      defaultValue: section.label,
                    }).toUpperCase()}
                  </ListSubheader>
                }
              >
                {sectionMenus.map((item) => (
                  <ListItemButton
                    key={item.path}
                    component={NavLink}
                    to={item.path}
                    end
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      "&.active": {
                        bgcolor: "#0F766E",
                        color: "#fff",
                        "& .MuiListItemIcon-root": {
                          color: "#fff",
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {item.icon}
                    </ListItemIcon>

                    <ListItemText
                      primary={t(item.translationKey, {
                        defaultValue: item.title,
                      })}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          );
        })}
      </Box>
    </Drawer>
  );
}
