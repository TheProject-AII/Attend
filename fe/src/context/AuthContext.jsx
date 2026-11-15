import { createContext, useContext, useEffect, useState } from "react";
import authService from "../services/authService";
import { Capacitor, registerPlugin } from "@capacitor/core";

const MockLocation = registerPlugin("MockLocation");
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const requestBackgroundGPS = async () => {
    if (
      Capacitor.isNativePlatform() &&
      Capacitor.getPlatform() === "android" &&
      !localStorage.getItem("background_gps_prompted")
    ) {
      try {
        localStorage.setItem("background_gps_prompted", "true");
        await MockLocation.openBackgroundLocationSettings();
      } catch (error) {
        console.error("Background GPS Settings:", error);
      }
    }
  };

  const loadUser = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setUser(null);
      setAuthError(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    setAuthError(null);

    try {
      if (
        Capacitor.isNativePlatform() &&
        Capacitor.getPlatform() === "android"
      ) {
        try {
          await MockLocation.configureAutoCheckout({
            token,
            apiUrl:
              "https://hris.so-mak.com/api/attendance/auto-checkout/location",
          });
        } catch (error) {
          console.error("AUTO CHECKOUT SCHEDULER ERROR:", error);
        }
      }

      const data = await authService.getMe(token);
      const currentUser = data.user;

      if (!currentUser) {
        throw new Error("Data user tidak ditemukan.");
      }

      setUser(currentUser);
      localStorage.setItem("user", JSON.stringify(currentUser));

      await requestBackgroundGPS();

      return currentUser;
    } catch (err) {
      console.error("Failed to load user:", err);

      const status = err.response?.status;

      // Hapus sesi hanya jika server memastikan autentikasi tidak valid.
      if (status === 401 || status === 404) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setAuthError("Sesi login berakhir. Silakan login kembali.");
      } else {
        // Gangguan jaringan/server tidak boleh menghapus token.
        const cachedUser = localStorage.getItem("user");

        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
          } catch {
            setUser(null);
          }
        }

        setAuthError(
          "Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.",
        );
      }

      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loadUser,
        loading,
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
