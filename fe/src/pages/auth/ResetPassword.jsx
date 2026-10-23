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

import { useSearchParams, useNavigate } from "react-router-dom";

import api from "../../services/api";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!token) {
            setError("Link reset password tidak valid.");
            return;
        }

        if (!password || !confirmPassword) {
            setError("Password wajib diisi.");
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

            const response = await api.post(
                "/auth/reset-password",
                {
                    token,
                    password,
                    password_confirmation: confirmPassword,
                },
            );

            setSuccess(
                response.data.message ||
                "Password berhasil diubah.",
            );

            setPassword("");
            setConfirmPassword("");

            setTimeout(() => {
                navigate("/");
            }, 2000);

        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.message ||
                "Gagal mengubah password.",
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
                bgcolor: "#f5f7f6",
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
                <CardContent sx={{ p: 4 }}>

                    <Typography
                        variant="h5"
                        fontWeight={700}
                        textAlign="center"
                        mb={1}
                    >
                        Reset Password
                    </Typography>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                        textAlign="center"
                        mb={3}
                    >
                        Masukkan password baru untuk akun Anda.
                    </Typography>

                    {error && (
                        <Alert
                            severity="error"
                            sx={{ mb: 2 }}
                        >
                            {error}
                        </Alert>
                    )}

                    {success && (
                        <Alert
                            severity="success"
                            sx={{ mb: 2 }}
                        >
                            {success}
                        </Alert>
                    )}

                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                    >

                        <TextField
                            fullWidth
                            label="Password Baru"
                            type={
                                showPassword
                                    ? "text"
                                    : "password"
                            }
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            margin="normal"
                            disabled={loading}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() =>
                                                setShowPassword(
                                                    !showPassword,
                                                )
                                            }
                                            edge="end"
                                        >
                                            {showPassword ? (
                                                <VisibilityOff />
                                            ) : (
                                                <Visibility />
                                            )}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            fullWidth
                            label="Konfirmasi Password"
                            type={
                                showConfirm
                                    ? "text"
                                    : "password"
                            }
                            value={confirmPassword}
                            onChange={(e) =>
                                setConfirmPassword(
                                    e.target.value,
                                )
                            }
                            margin="normal"
                            disabled={loading}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() =>
                                                setShowConfirm(
                                                    !showConfirm,
                                                )
                                            }
                                            edge="end"
                                        >
                                            {showConfirm ? (
                                                <VisibilityOff />
                                            ) : (
                                                <Visibility />
                                            )}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            sx={{
                                mt: 3,
                                py: 1.4,
                                borderRadius: 2,
                                bgcolor: "#16A34A",
                                "&:hover": {
                                    bgcolor: "#15803D",
                                },
                            }}
                        >
                            {loading
                                ? "Memproses..."
                                : "Reset Password"}
                        </Button>

                    </Box>

                </CardContent>
            </Card>
        </Box>
    );
}