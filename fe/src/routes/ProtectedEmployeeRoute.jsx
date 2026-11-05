import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
  const { user, loading } = useAuth();
  const location = useLocation();

  const token = localStorage.getItem("token");

  if (loading) {
    return null;
  }

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  const roleId = Number(user.role_id);

  const role = String(user.role?.name || user.role || user.role_name || "")
    .trim()
    .toUpperCase();

  const hasEmployeeAccess =
    EMPLOYEE_ROLE_IDS.includes(roleId) || EMPLOYEE_ROLES.includes(role);

  const isAdmin = ["ADMIN", "ADMIN HR"].includes(role);

  if (isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!hasEmployeeAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  const isFaceEnrollment = location.pathname === "/employee/face-enrollment";

  const isEnrolled = user.face_enrolled === true;

  if (!isEnrolled && !isFaceEnrollment) {
    return <Navigate to="/employee/face-enrollment" replace />;
  }

  if (isEnrolled && isFaceEnrollment) {
    return <Navigate to="/employee/attendance" replace />;
  }

  return children;
}
