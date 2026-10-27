import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedAdminRoute from "./ProtectedAdminRoute";
import ProtectedEmployeeRoute from "./ProtectedEmployeeRoute";

// Auth
import Login from "../pages/auth/Login";

// Admin
import Dashboard from "../pages/dashboard/Dashboard";
// import Report from "../pages/report/Report";
// import Settings from "../pages/settings/Settings";
import DashboardLayout from "../layouts/DashboardLayout";

// Employee
import EmployeeLayout from "../layouts/AbsensiLayout";
import EmployeeAttendance from "../pages/attendance/Attendance";
// import EmployeeHistory from "../pages/employee/History";
import EmployeeHistoryPage from "../pages/employee/EmployeeHistoryPage";
import EmployeeProfile from "../pages/employee/Profile";
import Leave from "../pages/employee/Leave";
import Approval from "../pages/employee/Approval";
import ApprovalDetail from "../pages/employee/ApprovalDetail";
import AdminAttendance from "../pages/attendance/AdminAttendance";
import EmployeeList from "../pages/employee/EmployeeList";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import Overtime from "../pages/employee/Overtime";
import OvertimeApprovalDetail from "../pages/employee/OvertimeApprovalDetail";
import OvertimeRecap from "../pages/dashboard/OvertimeRecap";
import OvertimeSettings from "../pages/setting/OvertimeSettings";
import OvertimeHistory from "../pages/employee/OvertimeHistory";
import Announcements from "../pages/dashboard/Announcements";
import AttendanceLateCompensation from "../pages/attendance/AttendanceLateCompensation";
import MyLateCompensation from "../pages/attendance/MyLateCompensation";

export default function AppRoutes() {
  const isLogin = !!localStorage.getItem("token");
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const role = user?.role?.toUpperCase();
  console.log("APP ROUTES DEBUG:", {
    tokenExists: !!token,
    user,
    role,
  });

  const DASHBOARD_ROLES = ["ADMIN", "HR", "ADMIN HR"];
  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN */}
        <Route
          path="/"
          element={
            !token || !user?.role ? (
              <Login />
            ) : DASHBOARD_ROLES.includes(role) ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/employee/attendance" replace />
            )
          }
        />

        {/* ===================== ADMIN ===================== */}

        <Route
          path="/dashboard"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Dashboard"
                subtitle={`Selamat Datang, ${user?.name} 👋`}
              >
                <Dashboard />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/attendance"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Absensi"
                subtitle="Kelola data absensi karyawan"
              >
                <AdminAttendance />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/attendance/late-compensation"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Keterlambatan"
                subtitle="Kelola data absensi karyawan"
              >
                <AttendanceLateCompensation />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/employees"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout title="Karyawan" subtitle="Kelola data karyawan">
                <EmployeeList />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/recap"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Lemburan"
                subtitle="Kelola Overtime Karyawan"
              >
                <OvertimeRecap />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/announcements"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Pengumuman"
                subtitle="Kelola Berita Untuk Karyawan"
              >
                <Announcements />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/settings"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Pengaturan"
                subtitle="Kelola Pengaturan Absensi"
              >
                <OvertimeSettings />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />

        {/*
                <Route
                    path="/report"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout>
                                <Report />
                            </DashboardLayout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout>
                                <Settings />
                            </DashboardLayout>
                        </ProtectedRoute>
                    }
                /> */}

        {/* ===================== EMPLOYEE ===================== */}

        <Route
          path="/employee"
          element={
            <ProtectedEmployeeRoute>
              <EmployeeLayout />
            </ProtectedEmployeeRoute>
          }
        >
          <Route path="attendance" element={<EmployeeAttendance />} />

          {/* <Route
            path="/my-late-compensation"
            element={<MyLateCompensation />}
          /> */}

          <Route path="history" element={<EmployeeHistoryPage />} />

          <Route path="my-late-compensation" element={<MyLateCompensation />} />

          <Route path="leave" element={<Leave />} />

          <Route path="approval" element={<Approval />} />

          <Route
            path="/employee/approval/overtime/:id"
            element={<OvertimeApprovalDetail />}
          />
          <Route path="approval/:id" element={<ApprovalDetail />} />

          <Route path="approval/attendance/:id" element={<ApprovalDetail />} />

          <Route path="profile" element={<EmployeeProfile />} />
          <Route path="overtime" element={<Overtime />} />
        </Route>
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/overtime" element={<OvertimeHistory />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
