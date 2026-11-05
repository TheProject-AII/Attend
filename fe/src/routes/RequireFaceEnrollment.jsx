import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireFaceEnrollment() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  const role = String(
    user?.role?.name || user?.role || user?.role_name || "",
  ).toUpperCase();

  const roleId = Number(user?.role_id);

  const isEmployee = role === "EMPLOYEE" || roleId === 3;

  if (isEmployee && user?.face_enrolled !== true) {
    if (location.pathname === "/employee/face-enrollment") {
      return <Outlet />;
    }

    return <Navigate to="/employee/face-enrollment" replace />;
  }

  if (
    isEmployee &&
    user?.face_enrolled === true &&
    location.pathname === "/employee/face-enrollment"
  ) {
    return <Navigate to="/employee/attendance" replace />;
  }

  return <Outlet />;
}
