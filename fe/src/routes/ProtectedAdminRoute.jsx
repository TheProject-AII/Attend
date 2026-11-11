import { Navigate, useLocation } from "react-router-dom";

const DASHBOARD_ROLES = ["ADMIN", "HR", "ADMIN HR", "FINANCE", "DIRECTOR"];

export default function ProtectedAdminRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("token");

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  const role = String(user.role || "")
    .trim()
    .toUpperCase();

  if (!DASHBOARD_ROLES.includes(role)) {
    return <Navigate to="/employee/attendance" replace />;
  }

  // Finance hanya boleh membuka Payroll dan Payroll Details.
  const isFinance = Number(user.role_id) === 6 || role === "FINANCE";

  const financeAllowedPaths = ["/payroll", "/payroll/details"];

  if (isFinance && !financeAllowedPaths.includes(location.pathname)) {
    return <Navigate to="/payroll" replace />;
  }

  return children;
}
