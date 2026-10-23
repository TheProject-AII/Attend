import DashboardIcon from "@mui/icons-material/Dashboard";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import GroupsIcon from "@mui/icons-material/Groups";
import BarChartIcon from "@mui/icons-material/BarChart";
import SettingsIcon from "@mui/icons-material/Settings";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CampaignIcon from "@mui/icons-material/Campaign";
import SchoolIcon from "@mui/icons-material/MenuBook";

const menu = [
    {
        title: "Dashboard",
        translationKey: "menu.dashboard",
        icon: <DashboardIcon />,
        path: "/dashboard",
        section: "overview",
    },
    {
        title: "Absensi",
        translationKey: "menu.attendance",
        icon: <LocationOnIcon />,
        path: "/admin/attendance",
        section: "management",
    },
    {
        title: "Karyawan",
        translationKey: "menu.employees",
        icon: <GroupsIcon />,
        path: "/admin/employees",
        section: "management",
    },
    {
        title: "My Orientation",
        translationKey: "menu.orientasi",
        icon: <SchoolIcon />,
        path: "/admin/orientation",
        section: "management",
    },
    {
        title: "Lemburan",
        translationKey: "menu.overtime",
        icon: <AccessTimeIcon />,
        path: "/admin/recap",
        section: "management",
    },
    {
        title: "Laporan",
        translationKey: "menu.reports",
        icon: <BarChartIcon />,
        path: "/report",
        section: "reports",
    },
    {
        title: "Pengumuman",
        translationKey: "menu.announcements",
        icon: <CampaignIcon />,
        path: "/admin/announcements",
        section: "system",
    },
    {
        title: "Pengaturan",
        translationKey: "menu.settings",
        icon: <SettingsIcon />,
        path: "/admin/settings",
        section: "system",
    },
];

export default menu;