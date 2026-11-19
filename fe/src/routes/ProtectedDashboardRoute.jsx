import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";

const DASHBOARD_ALLOWED_ROLE_IDS = [2, 6, 7];

export default function ProtectedDashboardRoute({ children }) {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const roleId = Number(user?.role_id);
  const isAllowed = DASHBOARD_ALLOWED_ROLE_IDS.includes(roleId);

  useEffect(() => {
    if (token && user && !isAllowed) {
      sessionStorage.setItem(
        "access_denied_message",
        "Anda tidak memiliki otorisasi untuk masuk ke sistem ini.",
      );

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      navigate("/", { replace: true });
    }
  }, [token, user, isAllowed, navigate]);

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  if (!isAllowed) {
    return null;
  }

  return children;
}
