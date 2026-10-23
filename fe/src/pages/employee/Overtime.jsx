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

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";

import dayjs from "dayjs";

import overtimeService from "../../services/overtimeService";

export default function Overtime() {

    const [form, setForm] = useState({
        overtime_date: dayjs().format("YYYY-MM-DD"),
        start_time: "17:00",
        end_time: "20:00",
        reason: "",
    });

    const [loading, setLoading] =
        useState(false);

    const [success, setSuccess] =
        useState("");

    const [error, setError] =
        useState("");

    const handleChange = (field) => (event) => {

        setForm((prev) => ({
            ...prev,
            [field]: event.target.value,
        }));

    };

    const handleSubmit = async (event) => {

        event.preventDefault();

        setSuccess("");
        setError("");

        if (!form.overtime_date) {
            setError("Tanggal lembur wajib diisi.");
            return;
        }

        if (!form.start_time) {
            setError("Jam mulai wajib diisi.");
            return;
        }

        if (!form.end_time) {
            setError("Jam selesai wajib diisi.");
            return;
        }

        if (!form.reason.trim()) {
            setError("Alasan lembur wajib diisi.");
            return;
        }

        if (form.end_time <= form.start_time) {
            setError(
                "Jam selesai harus lebih besar dari jam mulai.",
            );
            return;
        }

        try {

            setLoading(true);

            await overtimeService.create(form);

            setSuccess(
                "Pengajuan lembur berhasil dikirim.",
            );

            setForm((prev) => ({
                ...prev,
                reason: "",
            }));

        } catch (err) {

            console.error(err);

            setError(
                err.response?.data?.message ||
                "Gagal mengajukan lembur.",
            );

        } finally {

            setLoading(false);

        }
    };

    return (
        <Box sx={{ p: 2 }}>

            <Card
                sx={{
                    borderRadius: 3,
                    maxWidth: 650,
                    mx: "auto",
                }}
            >

                <CardContent sx={{ p: 3 }}>

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            mb: 3,
                        }}
                    >

                        <AccessTimeRoundedIcon
                            sx={{
                                color: "#16A34A",
                                fontSize: 32,
                            }}
                        />

                        <Box>

                            <Typography
                                variant="h6"
                                fontWeight={700}
                            >
                                Pengajuan Lembur
                            </Typography>

                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                Ajukan lembur Anda
                            </Typography>

                        </Box>

                    </Box>

                    {success && (
                        <Alert
                            severity="success"
                            sx={{ mb: 2 }}
                        >
                            {success}
                        </Alert>
                    )}

                    {error && (
                        <Alert
                            severity="error"
                            sx={{ mb: 2 }}
                        >
                            {error}
                        </Alert>
                    )}

                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                    >

                        <Stack spacing={2.5}>

                            <TextField
                                label="Tanggal Lembur"
                                type="date"
                                fullWidth
                                value={
                                    form.overtime_date
                                }
                                onChange={handleChange(
                                    "overtime_date",
                                )}
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                disabled={loading}
                            />

                            <Stack
                                direction={{
                                    xs: "column",
                                    sm: "row",
                                }}
                                spacing={2}
                            >

                                <TextField
                                    label="Jam Mulai"
                                    type="time"
                                    fullWidth
                                    value={
                                        form.start_time
                                    }
                                    onChange={handleChange(
                                        "start_time",
                                    )}
                                    InputLabelProps={{
                                        shrink: true,
                                    }}
                                    disabled={loading}
                                />

                                <TextField
                                    label="Jam Selesai"
                                    type="time"
                                    fullWidth
                                    value={
                                        form.end_time
                                    }
                                    onChange={handleChange(
                                        "end_time",
                                    )}
                                    InputLabelProps={{
                                        shrink: true,
                                    }}
                                    disabled={loading}
                                />

                            </Stack>

                            <TextField
                                label="Pekerjaan / Alasan Lembur"
                                placeholder="Contoh: Maintenance server"
                                multiline
                                minRows={4}
                                fullWidth
                                value={form.reason}
                                onChange={handleChange(
                                    "reason",
                                )}
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
                                    borderRadius: 2.5,
                                    bgcolor: "#16A34A",
                                    fontWeight: 600,
                                    textTransform:
                                        "none",
                                    "&:hover": {
                                        bgcolor:
                                            "#15803D",
                                    },
                                }}
                            >
                                {loading
                                    ? "Mengirim..."
                                    : "Ajukan Lembur"}
                            </Button>

                        </Stack>

                    </Box>

                </CardContent>

            </Card>

        </Box>
    );
}