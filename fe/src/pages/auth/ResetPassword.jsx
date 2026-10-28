import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

import { useLocation, useNavigate } from "react-router-dom";
import authService from "../../services/authService";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();

  // Token dikirim dari halaman ForgotPassword melalui navigation state.
  // URL token lama tetap didukung untuk kompatibilitas.
  const token =
    location.state?.token || new URLSearchParams(location.search).get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (completed || loading) return;

    if (!token) {
      setError(
        "Sesi reset password tidak ditemukan. Silakan ulangi verifikasi akun.",
      );
      return;
    }

    if (!password || !confirmPassword) {
      setError("Password baru dan konfirmasi password wajib diisi.");
      return;
    }

    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    try {
      setLoading(true);

      const response = await authService.resetPassword(
        token,
        password,
        confirmPassword,
      );

      if (!response.success) {
        setError(response.message || "Gagal mengubah password.");
        return;
      }

      setCompleted(true);
      setSuccess(
        response.message || "Password berhasil diubah. Silakan login kembali.",
      );

      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err);

      setError(err.response?.data?.message || "Gagal mengubah password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 3,
        bgcolor: "#F5F7F6",
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 430,
          borderRadius: 3,
          boxShadow: "0 10px 30px rgba(0,0,0,.08)",
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h5" fontWeight={700} textAlign="center" mb={1}>
            Reset Password
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            mb={3}
          >
            Buat password baru untuk akun KJI Attendance Anda.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              required
              label="Password Baru"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              autoComplete="new-password"
              disabled={loading || completed}
              inputProps={{ minLength: 8 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                      aria-label={
                        showPassword ? "Sembunyikan password" : "Lihat password"
                      }
                      disabled={loading || completed}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              required
              label="Konfirmasi Password"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              autoComplete="new-password"
              disabled={loading || completed}
              inputProps={{ minLength: 8 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      type="button"
                      onClick={() => setShowConfirm((prev) => !prev)}
                      edge="end"
                      aria-label={
                        showConfirm
                          ? "Sembunyikan konfirmasi password"
                          : "Lihat konfirmasi password"
                      }
                      disabled={loading || completed}
                    >
                      {showConfirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || completed || !token}
              sx={{
                mt: 3,
                py: 1.4,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                bgcolor: "#16A34A",
                "&:hover": { bgcolor: "#15803D" },
              }}
            >
              {loading
                ? "Memproses..."
                : completed
                  ? "Password Berhasil Diubah"
                  : "Simpan Password Baru"}
            </Button>

            <Button
              type="button"
              fullWidth
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => navigate("/", { replace: true })}
              sx={{
                mt: 1,
                textTransform: "none",
                color: "#16A34A",
              }}
            >
              Kembali ke Login
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
