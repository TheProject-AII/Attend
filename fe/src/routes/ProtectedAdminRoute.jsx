import { Navigate } from "react-router-dom";

const DASHBOARD_ALLOWED_ROLE_IDS = [2, 6, 7];

export default function ProtectedAdminRoute({ children }) {
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

  const roleId = Number(user.role_id);

  // Role tidak memiliki akses dashboard
  if (!DASHBOARD_ALLOWED_ROLE_IDS.includes(roleId)) {
    sessionStorage.setItem(
      "access_denied_message",
      "Anda tidak memiliki otorisasi untuk masuk ke sistem ini.",
    );

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    return <Navigate to="/" replace />;
  }

  // Finance hanya boleh membuka halaman tertentu
  const isFinance = roleId === 6;

  const financeAllowedPaths = [
    "/payroll",
    "/payroll/details",
    "/business-trip/finance",
  ];

  if (isFinance && !financeAllowedPaths.includes(window.location.pathname)) {
    return <Navigate to="/payroll" replace />;
  }

  return children;
}
