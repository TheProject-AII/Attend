
import { Navigate } from "react-router-dom";

const DASHBOARD_ROLES = ["ADMIN", "HR", "ADMIN HR"];

export default function ProtectedAdminRoute({ children }) {
    const token = localStorage.getItem("token");

    let user = null;

    try {
        user = JSON.parse(
            localStorage.getItem("user") || "null"
        );
    } catch {
        user = null;
    }

    // Tidak ada token atau data user
    if (!token || !user) {
        return <Navigate to="/" replace />;
    }

    // Normalisasi role
    const role = String(user.role || "")
        .trim()
        .toUpperCase();

    // Admin dan HR boleh masuk dashboard
    if (!DASHBOARD_ROLES.includes(role)) {
        return (
            <Navigate
                to="/employee/attendance"
                replace
            />
        );
    }

    return children;
}
