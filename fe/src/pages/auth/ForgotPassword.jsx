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

import { useNavigate, useLocation } from "react-router-dom";
import authService from "../../services/authService";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [nikLast4, setNikLast4] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fromProfile = location.state?.fromProfile === true;

  const handleCancel = () => {
    if (fromProfile) {
      navigate(location.state?.returnPath || "/employee/profile", {
        replace: true,
      });
    } else {
      navigate("/login", { replace: true });
    }
  };

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
          borderRadius: 1,
        }}
      >
        <CardContent
          sx={{
            p: { xs: 3, sm: 5 },
            "&:last-child": {
              pb: { xs: 3, sm: 5 },
            },
          }}
        >
          <Typography variant="h5" fontWeight={700} textAlign="center">
            Forgot Password?
          </Typography>

          <Typography
            color="text.secondary"
            textAlign="center"
            sx={{
              mt: 1,
              mb: 4,
            }}
          >
            Verify your account using your email and the last 4 digits of your
            KTP number.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
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
                helperText="Insert the last 4 numbers of your NIK."
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
                  borderRadius: 1,
                  textTransform: "none",
                  fontWeight: 600,
                  bgcolor: "#102E67",
                  "&:hover": {
                    bgcolor: "#638ef2",
                  },
                }}
              >
                {loading ? "Memverifikasi..." : "Verifikasi Akun"}
              </Button>

              <Button
                type="button"
                variant="outlined"
                fullWidth
                disabled={loading}
                onClick={handleCancel}
                sx={{
                  height: 44,
                  borderRadius: 1,
                  textTransform: "none",
                  fontWeight: 600,
                  borderColor: "divider",
                  color: "text.secondary",
                  "&:hover": {
                    borderColor: "text.secondary",
                    bgcolor: "action.hover",
                  },
                }}
              >
                Cancel
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
