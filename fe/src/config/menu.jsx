import DashboardIcon from "@mui/icons-material/Dashboard";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import GroupsIcon from "@mui/icons-material/Groups";
import BarChartIcon from "@mui/icons-material/BarChart";
import SettingsIcon from "@mui/icons-material/Settings";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CampaignIcon from "@mui/icons-material/Campaign";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PercentIcon from "@mui/icons-material/Percent";

const menu = [
  {
    title: "Dashboard",
    translationKey: "menu.dashboard",
    icon: <DashboardIcon />,
    path: "/dashboard",
    section: "overview",
  },
  {
    title: "Attendance",
    translationKey: "menu.attendance",
    icon: <LocationOnIcon />,
    path: "/admin/attendance",
    section: "management",
  },
  {
    title: "Employees",
    translationKey: "menu.employees",
    icon: <GroupsIcon />,
    path: "/admin/employees",
    section: "management",
  },

  {
    title: "Late Compensation",
    translationKey: "menu.lateCompensation",
    path: "/admin/attendance/late-compensation",
    icon: <CalendarMonthIcon />,
    section: "management",
  },
  {
    title: "Leave & Permission",
    translationKey: "menu.leaveHistory",
    icon: <AssignmentIndIcon />,
    path: "/admin/leave-history",
    section: "management",
  },
  {
    title: "Payroll",
    translationKey: "menu.payroll",
    icon: <AccountBalanceWalletIcon />,
    path: "/payroll",
    section: "management",
  },
  {
    title: "Payroll Details",
    translationKey: "menu.payrollDetails",
    icon: <ReceiptLongIcon />,
    path: "/payroll/details",
    section: "management",
  },
  {
    title: "Master TER",
    translationKey: "menu.masterTER",
    icon: <PercentIcon />,
    path: "/master-ter",
    section: "management",
  },

  // {
  //   title: "Overtime",
  //   translationKey: "menu.overtime",
  //   icon: <AccessTimeIcon />,
  //   path: "/admin/recap",
  //   section: "management",
  // },
  // {
  //   title: "Reports",
  //   translationKey: "menu.reports",
  //   icon: <BarChartIcon />,
  //   path: "/report",
  //   section: "reports",
  // },
  {
    title: "Announcements",
    translationKey: "menu.announcements",
    icon: <CampaignIcon />,
    path: "/admin/announcements",
    section: "system",
  },
  {
    title: "Settings",
    translationKey: "menu.settings",
    icon: <SettingsIcon />,
    path: "/admin/settings",
    section: "system",
  },
];

export default menu;
