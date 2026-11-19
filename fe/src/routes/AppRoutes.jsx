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
import OvertimeSettings from "../pages/setting/Settings";
import OvertimeHistory from "../pages/employee/OvertimeHistory";
import Announcements from "../pages/dashboard/Announcements";
import AttendanceLateCompensation from "../pages/attendance/AttendanceLateCompensation";
import MyLateCompensation from "../pages/attendance/MyLateCompensation";
import FaceEnrollment from "../pages/employee/FaceEnrollment";
import LeaveHistory from "../pages/employee/LeaveHistory";
import EditProfile from "../pages/employee/EditProfile";
import AboutCompany from "../pages/employee/AboutCompany";
import RequireFaceEnrollment from "../routes/RequireFaceEnrollment";
import Payroll from "../pages/dashboard/Payroll";
import PayrollDetails from "../pages/dashboard/PayrollDetails";
import PaySlipRequests from "../pages/dashboard/PaySlipRequests";
import MasterTER from "../pages/dashboard/MasterTER";
import BusinessTripEmployee from "../pages/business-trip/BusinessTripEmployee";
import BusinessTripApprovalDetail from "../pages/business-trip/BusinessTripApprovalDetail";
import AndroidUpdatePrompt from "../components/AndroidUpdatePrompt";
import BusinessTripHRDetail from "../pages/business-trip/BusinessTripHRDetail";
import BusinessTripHR from "../pages/business-trip/BusinessTripHR";
import BusinessTripFinance from "../pages/business-trip/BusinessTripFinance";
import BusinessTripDirector from "../pages/business-trip/BusinessTripDirector";
import BusinessTripDirectorDetail from "../pages/business-trip/BusinessTripDirectorDetail";
import PaySlip from "../pages/employee/PaySlip";
import AccountBank from "../pages/employee/AccountBank";
import ProtectedDashboardRoute from "./ProtectedDashboardRoute";

export default function AppRoutes() {
  const token = localStorage.getItem("token");

  let user = null;

  try {
    const rawUser = localStorage.getItem("user");

    if (rawUser && rawUser !== "undefined") {
      user = JSON.parse(rawUser);
    }
  } catch (error) {
    console.error("Invalid user data in localStorage:", error);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }

  const role = String(user?.role || "")
    .trim()
    .toUpperCase();

  console.log("APP ROUTES DEBUG:", {
    tokenExists: !!localStorage.getItem("token"),
    user,
    role,
  });

  const isFinance = Number(user?.role_id) === 6;
  const isDashboardRole = [2, 7].includes(Number(user?.role_id));
  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN */}
        <Route
          path="/"
          element={
            !token || !user?.role ? (
              <Login />
            ) : isFinance ? (
              <Navigate to="/payroll" replace />
            ) : isDashboardRole ? (
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
            <ProtectedDashboardRoute>
              <DashboardLayout
                title="Dashboard"
                subtitle={`Welcome, ${user?.name} 👋`}
              >
                <Dashboard />
              </DashboardLayout>
            </ProtectedDashboardRoute>
          }
        />
        <Route
          path="/admin/attendance"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Attendance"
                subtitle="Manage employee attendance"
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
                title="Late Arrivals"
                subtitle="Manage employee attendance"
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
              <DashboardLayout
                title="Employees"
                subtitle="Manage employee records"
              >
                <EmployeeList />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/leave-history"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Leave & Permission History"
                subtitle="Monitor employee leave and permission requests"
              >
                <LeaveHistory />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/business-trips"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Business Trip"
                subtitle="Manage employee business trips"
              >
                <BusinessTripHR />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/business-trip/hr"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Business Trip"
                subtitle="Manage employee business trips"
              >
                <BusinessTripHR />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/business-trip/hr/:id"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Business Trip"
                subtitle="Manage employee business trips"
              >
                <BusinessTripHRDetail />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/business-trip/director"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Business Trip Approval"
                subtitle="Review pengajuan perjalanan dinas"
              >
                <BusinessTripDirector />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/business-trip/director/:id"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Detail Business Trip"
                subtitle="Persetujuan perjalanan dinas oleh Direktur"
              >
                <BusinessTripDirectorDetail />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/business-trip/finance"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Business Trip Approval"
                subtitle="Review kebutuhan dana perjalanan dinas"
              >
                <BusinessTripFinance />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/recap"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Overtime"
                subtitle="Manage employee overtime"
              >
                <OvertimeRecap />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/payroll"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Payroll"
                subtitle="Manage employee salaries and payroll"
              >
                <Payroll />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/payroll/details"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Payroll Details"
                subtitle="Employee salary breakdown and payroll calculation"
              >
                <PayrollDetails />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/pay-slip-requests"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Pay Slip Requests"
                subtitle="Manage employee pay slip requests"
              >
                <PaySlipRequests />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/master-ter"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Master TER"
                subtitle="Manage PPh 21 TER rates"
              >
                <MasterTER />
              </DashboardLayout>
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/announcements"
          element={
            <ProtectedAdminRoute>
              <DashboardLayout
                title="Announcements"
                subtitle="Manage employee announcements"
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
                title="Settings"
                subtitle="Manage attendance settings"
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
              <RequireFaceEnrollment />
            </ProtectedEmployeeRoute>
          }
        >
          <Route element={<EmployeeLayout />}>
            <Route path="attendance" element={<EmployeeAttendance />} />

            <Route path="face-enrollment" element={<FaceEnrollment />} />

            <Route path="history" element={<EmployeeHistoryPage />} />

            <Route
              path="my-late-compensation"
              element={<MyLateCompensation />}
            />

            <Route path="leave" element={<Leave />} />

            <Route path="approval" element={<Approval />} />

            <Route
              path="approval/overtime/:id"
              element={<OvertimeApprovalDetail />}
            />

            <Route
              path="approval/business-trip/:id"
              element={<BusinessTripApprovalDetail />}
            />

            <Route
              path="approval/attendance/:id"
              element={<ApprovalDetail />}
            />

            <Route path="approval/:id" element={<ApprovalDetail />} />

            <Route path="about-company" element={<AboutCompany />} />

            <Route path="profile" element={<EmployeeProfile />} />
            <Route path="pay-slip" element={<PaySlip />} />
            <Route path="account-bank" element={<AccountBank />} />
            <Route path="edit-profile" element={<EditProfile />} />

            <Route path="overtime" element={<Overtime />} />
          </Route>
        </Route>

        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/overtime" element={<OvertimeHistory />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AndroidUpdatePrompt />
    </BrowserRouter>
  );
}
