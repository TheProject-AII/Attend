
import { useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import {
    ArrowForwardRounded,
    BadgeOutlined,
    CheckCircleOutlineRounded,
    LockOutlined,
    ShieldOutlined,
    Visibility,
    VisibilityOff,
} from "@mui/icons-material";

import { useNavigate } from "react-router-dom";
import authService from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

const getRedirectPath = (role) => {
    const normalizedRole = String(role || "").trim().toUpperCase();

    return ["ADMIN", "HR", "ADMIN HR"].includes(normalizedRole)
        ? "/dashboard"
        : "/employee/attendance";
};

export default function Login() {
    const navigate = useNavigate();
    const { loadUser } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const user = JSON.parse(localStorage.getItem("user") || "null");

            if (user?.role) {
                navigate(getRedirectPath(user.role), { replace: true });
            }
        } catch (err) {
            console.error("Invalid stored user:", err);
        }
    }, [navigate]);

    const handleLogin = async (event) => {
        event.preventDefault();
        setError("");

        if (!email.trim() || !password) {
            setError("Email dan password wajib diisi.");
            return;
        }

        try {
            setLoading(true);

            const data = await authService.login(email.trim(), password);

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            await loadUser();

            const token = localStorage.getItem("token");

            if (!token) {
                throw new Error("Sesi login tidak valid. Silakan login kembali.");
            }

            navigate(getRedirectPath(data.user.role), { replace: true });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "Login gagal. Silakan coba kembali."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100dvh",
                display: "flex",
                bgcolor: "#F5F7FB",
                fontFamily: "'Inter', 'Roboto', sans-serif",
            }}
        >
            {/* LEFT BRANDING PANEL - DESKTOP */}
            <Box
                sx={{
                    display: { xs: "none", md: "flex" },
                    width: "52%",
                    minHeight: "100dvh",
                    position: "relative",
                    overflow: "hidden",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    p: { md: 5, lg: 8 },
                    color: "#fff",
                    background:
                        "linear-gradient(145deg, #0B1736 0%, #152D62 55%, #2557B0 100%)",
                }}
            >
                {/* DECORATIVE CIRCLES */}
                <Box
                    sx={{
                        position: "absolute",
                        width: 480,
                        height: 480,
                        borderRadius: "50%",
                        border: "1px solid rgba(255,255,255,0.10)",
                        right: -180,
                        top: -160,
                    }}
                />
                <Box
                    sx={{
                        position: "absolute",
                        width: 600,
                        height: 600,
                        borderRadius: "50%",
                        border: "1px solid rgba(255,255,255,0.08)",
                        left: -320,
                        bottom: -360,
                    }}
                />

                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ zIndex: 1 }}>
                    <Box sx={{ zIndex: 1 }}>
                        <Box
                            component="img"
                            src="/icon/logo_hris_small.png"
                            alt="ATTEND Logo"
                            sx={{
                                width: 50,
                                height: "auto",
                                objectFit: "contain",
                                display: "block",
                                bgcolor: "#FFFFFF",
                                borderRadius: 2,
                                p: 1,
                            }}
                        />
                    </Box>

                    <Box>
                        <Typography fontWeight={800} fontSize={20} letterSpacing={0.4}>
                            AII
                        </Typography>
                        <Typography fontSize={11} sx={{ opacity: 0.7 }}>
                            Human Resource Information System
                        </Typography>
                    </Box>
                </Stack>

                <Box sx={{ zIndex: 1, maxWidth: 540 }}>


                    <Typography
                        sx={{
                            fontSize: { md: 42, lg: 55 },
                            fontWeight: 800,
                            lineHeight: 1.15,
                            letterSpacing: -1.5,
                        }}
                    >
                        Kelola pekerjaan.
                        <Box component="span" sx={{ display: "block", color: "#93C5FD" }}>
                            Lebih mudah.
                        </Box>
                    </Typography>

                    <Typography
                        sx={{
                            mt: 3,
                            fontSize: 16,
                            lineHeight: 1.9,
                            color: "rgba(255,255,255,0.72)",
                            maxWidth: 440,
                        }}
                    >
                        Satu platform untuk mengelola kehadiran, informasi karyawan,
                        dan aktivitas sumber daya manusia secara lebih efisien.
                    </Typography>

                    <Stack spacing={2.5} sx={{ mt: 5 }}>
                        {[
                            "Monitoring kehadiran karyawan",
                            "Manajemen data yang terintegrasi",
                            "Akses mudah dan fleksibel",
                        ].map((item) => (
                            <Stack key={item} direction="row" alignItems="center" spacing={1.5}>
                                <CheckCircleOutlineRounded
                                    sx={{ fontSize: 21, color: "#93C5FD" }}
                                />
                                <Typography fontSize={14} sx={{ color: "#E2E8F0" }}>
                                    {item}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                </Box>

                <Typography
                    sx={{
                        zIndex: 1,
                        fontSize: 12,
                        color: "rgba(255,255,255,0.48)",
                    }}
                >
                    © {new Date().getFullYear()} PT.xxxxx . All rights reserved.
                </Typography>
            </Box>

            {/* RIGHT LOGIN PANEL */}
            <Box
                sx={{
                    width: { xs: "100%", md: "48%" },
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    px: { xs: 3, sm: 5, md: 6 },
                    py: { xs: 5, md: 6 },
                    bgcolor: "#FFFFFF",
                }}
            >
                <Box sx={{ width: "100%", maxWidth: 420 }}>
                    {/* MOBILE BRAND */}
                    <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        sx={{ display: { xs: "flex", md: "none" }, mb: 7 }}
                    >
                        <Box
                            sx={{
                                display: { xs: "flex", md: "none" },
                                justifyContent: "center",
                                alignItems: "center",
                                mb: 2,
                            }}
                        >
                            <Box
                                component="img"
                                src="/icon/logo_hris_small.png"
                                alt="HR Management System"
                                sx={{
                                    width: { xs: 180, sm: 200 },
                                    maxWidth: "100%",
                                    height: "auto",
                                    objectFit: "contain",
                                    display: "block",
                                }}
                            />
                        </Box>
                        <Box>
                            <Typography fontSize={20} fontWeight={800} color="#102348">
                                AII
                            </Typography>
                            <Typography fontSize={10} color="#64748B">
                                Human Resource Information System
                            </Typography>
                        </Box>
                    </Stack>

                    <Typography
                        sx={{
                            fontSize: { xs: 20, sm: 16 },
                            fontWeight: 800,
                            letterSpacing: -1,
                            textAlign: "center",
                            color: "#0F172A",
                        }}
                    >
                        Selamat datang!
                    </Typography>

                    <Typography
                        sx={{
                            mt: 1.5,
                            mb: 2.5,
                            fontSize: 10,
                            lineHeight: 1.8,
                            textAlign: "center",
                            color: "#64748B",
                        }}
                    >
                        Masukkan akun Anda untuk melanjutkan aktivitas.                    </Typography>

                    <Box component="form" onSubmit={handleLogin} noValidate>
                        <Stack spacing={2.5}>
                            <Box>
                                <Typography
                                    sx={{
                                        mb: 1,
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: "#334155",
                                    }}
                                >
                                    Alamat Email
                                </Typography>

                                <TextField
                                    fullWidth
                                    type="email"
                                    placeholder="nama@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="username"
                                    disabled={loading}
                                    slotProps={{
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <BadgeOutlined sx={{ color: "#94A3B8", fontSize: 20 }} />
                                                </InputAdornment>
                                            ),
                                        },
                                    }}
                                    sx={fieldStyle}
                                />
                            </Box>

                            <Box>
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    sx={{ mb: 1 }}
                                >
                                    <Typography
                                        sx={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: "#334155",
                                        }}
                                    >
                                        Password
                                    </Typography>

                                    <Button
                                        type="button"
                                        onClick={() => navigate("/forgot-password")}
                                        sx={{
                                            textTransform: "none",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: "#2455AA",
                                            p: 0,
                                            pl: 2,
                                            minWidth: 0,
                                        }}
                                    >
                                        Lupa password?
                                    </Button>
                                </Stack>

                                <TextField
                                    fullWidth
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Masukkan password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    disabled={loading}
                                    slotProps={{
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <LockOutlined sx={{ color: "#94A3B8", fontSize: 20 }} />
                                                </InputAdornment>
                                            ),
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        type="button"
                                                        onClick={() => setShowPassword((prev) => !prev)}
                                                        edge="end"
                                                        aria-label={
                                                            showPassword ? "Sembunyikan password" : "Tampilkan password"
                                                        }
                                                    >
                                                        {showPassword ? (
                                                            <VisibilityOff fontSize="small" />
                                                        ) : (
                                                            <Visibility fontSize="small" />
                                                        )}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        },
                                    }}
                                    sx={fieldStyle}
                                />
                            </Box>

                            {error && (
                                <Alert severity="error" sx={{ borderRadius: 2 }}>
                                    {error}
                                </Alert>
                            )}

                            <Button
                                fullWidth
                                variant="contained"
                                type="submit"
                                disabled={loading}
                                endIcon={
                                    loading ? (
                                        <CircularProgress size={18} color="inherit" />
                                    ) : (
                                        <ArrowForwardRounded />
                                    )
                                }
                                sx={{
                                    mt: 4,
                                    height: 54,
                                    borderRadius: 2.5,
                                    bgcolor: "#173C81",
                                    textTransform: "none",
                                    fontSize: 15,
                                    fontWeight: 700,
                                    boxShadow: "0 8px 22px rgba(23,60,129,0.18)",
                                    "&:hover": {
                                        bgcolor: "#102E67",
                                        boxShadow: "0 10px 24px rgba(23,60,129,0.24)",
                                    },
                                }}
                            >
                                {loading ? "Sedang masuk..." : "Masuk"}
                            </Button>
                        </Stack>
                    </Box>


                    <Typography
                        sx={{
                            display: { xs: "block", md: "none" },
                            mt: 5,
                            textAlign: "center",
                            fontSize: 11,
                            color: "#94A3B8",
                        }}
                    >
                        © {new Date().getFullYear()} HRIS
                        Version 1.0.0
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}

const fieldStyle = {
    "& .MuiOutlinedInput-root": {
        height: 54,
        borderRadius: 2.5,
        bgcolor: "#F8FAFC",
        "& fieldset": {
            borderColor: "#E2E8F0",
        },
        "&:hover fieldset": {
            borderColor: "#94A3B8",
        },
        "&.Mui-focused fieldset": {
            borderColor: "#2455AA",
            borderWidth: 1.5,
        },
    },
    "& input": {
        fontSize: 14,
    },
};
