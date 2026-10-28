import { Navigate } from "react-router-dom";

const EMPLOYEE_ROLE_IDS = [2, 3, 4, 5];

const EMPLOYEE_ROLES = [
  "EMPLOYEE",
  "HR",
  "SUPERVISOR",
  "MANAGER",
  "STAFF",
  "SPV",
  "DIRUT",
];

export default function ProtectedEmployeeRoute({ children }) {
  const token = localStorage.getItem("token");

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return <Navigate to="/" replace />;
  }

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  const roleId = Number(user.role_id);
  const role = String(user.role || "")
    .trim()
    .toUpperCase();

  const hasEmployeeAccess =
    EMPLOYEE_ROLE_IDS.includes(roleId) || EMPLOYEE_ROLES.includes(role);

  const isAdminOrHr = ["ADMIN", "HR", "ADMIN HR"].includes(role);

  if (isAdminOrHr) {
    return <Navigate to="/dashboard" replace />;
  }

  if (
    !user?.face_enrolled &&
    location.pathname !== "/employee/face-enrollment"
  ) {
    return <Navigate to="/employee/face-enrollment" replace />;
  }

  if (
    user?.face_enrolled &&
    location.pathname === "/employee/face-enrollment"
  ) {
    return <Navigate to="/employee/attendance" replace />;
  }

  if (!hasEmployeeAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
