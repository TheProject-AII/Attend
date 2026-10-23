import { useState } from "react";

import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Stack,
    TextField,
    Typography
} from "@mui/material";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

import { useNavigate } from "react-router-dom";

import api from "../../services/api";

export default function ForgotPassword() {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");

    const [loading, setLoading] =
        useState(false);

    const [success, setSuccess] =
        useState("");

    const [error, setError] =
        useState("");

    const handleSubmit = async (e) => {

        e.preventDefault();

        setSuccess("");
        setError("");

        if (!email) {

            setError(
                "Email wajib diisi."
            );

            return;
        }

        try {

            setLoading(true);

            const response =
                await api.post(
                    "/auth/forgot-password",
                    {
                        email
                    }
                );

            setSuccess(
                response.data.message ||
                "Link reset password telah dikirim."
            );

        } catch (err) {

            console.error(err);

            setError(
                err.response?.data?.message ||
                "Gagal mengirim link reset password."
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
                bgcolor: "#F5F7FB"
            }}
        >

            <Card
                elevation={4}
                sx={{
                    width: "100%",
                    maxWidth: 420,
                    borderRadius: 4
                }}
            >

                <CardContent
                    sx={{
                        p: 5
                    }}
                >

                    <Typography
                        variant="h5"
                        fontWeight={700}
                        textAlign="center"
                    >
                        Lupa Password?
                    </Typography>

                    <Typography
                        color="text.secondary"
                        textAlign="center"
                        sx={{
                            mt: 1,
                            mb: 4
                        }}
                    >
                        Masukkan email yang
                        terdaftar di KJI Attendance.
                    </Typography>

                    {success && (

                        <Alert
                            severity="success"
                            sx={{ mb: 3 }}
                        >
                            {success}
                        </Alert>

                    )}

                    {error && (

                        <Alert
                            severity="error"
                            sx={{ mb: 3 }}
                        >
                            {error}
                        </Alert>

                    )}

                    <Box
                        component="form"
                        onSubmit={
                            handleSubmit
                        }
                    >

                        <Stack spacing={3}>

                            <TextField
                                label="Email"
                                type="email"
                                fullWidth
                                value={email}
                                onChange={(e) =>
                                    setEmail(
                                        e.target.value
                                    )
                                }
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
                                    textTransform:
                                        "none",
                                    fontWeight: 600,
                                    bgcolor:
                                        "#16A34A",
                                    "&:hover": {
                                        bgcolor:
                                            "#15803D"
                                    }
                                }}
                            >
                                {loading
                                    ? "Mengirim..."
                                    : "Kirim Link Reset Password"}
                            </Button>

                            <Button
                                variant="text"
                                startIcon={
                                    <ArrowBackRoundedIcon />
                                }
                                onClick={() =>
                                    navigate("/")
                                }
                                sx={{
                                    color:
                                        "#16A34A",
                                    textTransform:
                                        "none",
                                    fontWeight: 600
                                }}
                            >
                                Kembali ke Login
                            </Button>

                        </Stack>

                    </Box>

                </CardContent>

            </Card>

        </Box>

    );
}