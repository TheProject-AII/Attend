import { useEffect } from "react";

const IDLE_LIMIT = 60 * 60 * 1000;
const ACTIVITY_THROTTLE = 60 * 1000;

export default function useAdminIdleLogout() {
  useEffect(() => {
    // Sesuaikan key penyimpanan dengan aplikasi lo
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token || !userRaw) return;

    let user;

    try {
      user = JSON.parse(userRaw);
    } catch {
      return;
    }

    if (String(user.role).toLowerCase() !== "admin") return;

    let lastActivitySent = 0;
    let lastActivityAt = Date.now();
    let loggingOut = false;

    const logout = () => {
      if (loggingOut) return;
      loggingOut = true;

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      window.location.replace("/login");
    };

    const recordActivity = async () => {
      const now = Date.now();

      if (now - lastActivitySent < ACTIVITY_THROTTLE) return;

      lastActivitySent = now;

      try {
        const response = await fetch("/api/auth/activity", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          logout();
        }
      } catch (error) {
        console.error("Gagal mengirim aktivitas:", error);
      }
    };

    const handleActivity = () => {
      lastActivityAt = Date.now();
      recordActivity();
    };

    const events = ["click", "keydown", "mousemove", "scroll", "touchstart"];

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, {
        passive: true,
      });
    });

    // Cek batas idle secara lokal
    const idleTimer = window.setInterval(() => {
      if (Date.now() - lastActivityAt >= IDLE_LIMIT) {
        logout();
      }
    }, 1000);

    // Catat waktu aktivitas awal setelah hook aktif
    recordActivity();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });

      window.clearInterval(idleTimer);
    };
  }, []);
}
