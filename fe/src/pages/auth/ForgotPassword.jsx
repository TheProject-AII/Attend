import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useNavigate } from "react-router-dom";
import authService from "../../services/authService";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [nikLast4, setNikLast4] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Email wajib diisi.");
      return;
    }

    if (!/^\d{4}$/.test(nikLast4)) {
      setError("Masukkan 4 digit terakhir NIK KTP.");
      return;
    }

    try {
      setLoading(true);

      const response = await authService.forgotPassword(
        normalizedEmail,
        nikLast4,
      );

      if (response.success && response.resetToken) {
        navigate("/reset-password", {
          state: { token: response.resetToken },
          replace: true,
        });
      } else {
        setError(response.message || "Verifikasi gagal. Silakan coba kembali.");
      }
    } catch (err) {
      console.error("FORGOT PASSWORD ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Verifikasi gagal. Periksa kembali data Anda.",
      );
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
        bgcolor: "#F5F7FB",
      }}
    >
      <Card
        elevation={4}
        sx={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 4,
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          <Typography variant="h5" fontWeight={700} textAlign="center">
            Forgot Password?
          </Typography>

          <Typography
            color="text.secondary"
            textAlign="center"
            sx={{ mt: 1, mb: 4 }}
          >
            Verifikasi akun KJI Attendance menggunakan email dan 4 digit
            terakhir NIK KTP Anda.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                label="Email terdaftar"
                type="email"
                autoComplete="email"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />

              <TextField
                label="4 digit terakhir NIK KTP"
                type="password"
                fullWidth
                required
                value={nikLast4}
                onChange={(e) =>
                  setNikLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                inputProps={{
                  inputMode: "numeric",
                  maxLength: 4,
                  pattern: "[0-9]{4}",
                }}
                helperText="Masukkan empat angka terakhir NIK Anda."
                disabled={loading}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{
                  height: 50,
                  borderRadius: 3,
                  textTransform: "none",
                  fontWeight: 600,
                  bgcolor: "#16A34A",
                  "&:hover": { bgcolor: "#15803D" },
                }}
              >
                {loading ? "Memverifikasi..." : "Verifikasi Akun"}
              </Button>

              <Button
                type="button"
                variant="text"
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => navigate("/")}
                disabled={loading}
                sx={{
                  color: "#16A34A",
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                Back to Sign In
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
