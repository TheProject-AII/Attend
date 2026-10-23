import { useEffect, useState } from "react";

import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Stack,
    Divider,
    InputAdornment
} from "@mui/material";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SaveIcon from "@mui/icons-material/Save";

import Swal from "sweetalert2";

import api from "../../services/api";

const formatNumber = (value) => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "";
    }

    return new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: 0
    }).format(Number(value));
};

const parseNumber = (value) => {
    return Number(
        String(value)
            .replace(/\./g, "")
            .replace(",", ".")
    );
};

export default function OvertimeSettings() {

    const [weekdayRate, setWeekdayRate] =
        useState("");

    const [weekendRate, setWeekendRate] =
        useState("");

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);


    // =====================================
    // LOAD SETTINGS
    // =====================================

    const loadSettings = async () => {

        try {

            setLoading(true);

            const response =
                await api.get("/overtime/admin/settings");

            const data =
                response.data?.data;
            setWeekdayRate(
                formatNumber(data?.weekday_rate)
            );

            setWeekendRate(
                formatNumber(data?.weekend_rate)
            );

        } catch (err) {

            console.error(
                "LOAD OVERTIME SETTINGS ERROR:",
                err
            );

            Swal.fire({
                icon: "error",
                title: "Gagal",
                text:
                    err.response?.data?.message ||
                    "Gagal mengambil pengaturan tarif lembur."
            });

        } finally {

            setLoading(false);

        }

    };


    useEffect(() => {

        loadSettings();

    }, []);


    // =====================================
    // SAVE SETTINGS
    // =====================================

    const handleSave = async () => {

        const weekday =
            parseNumber(weekdayRate);

        const weekend =
            parseNumber(weekendRate);

        if (
            !Number.isFinite(weekday) ||
            !Number.isFinite(weekend)
        ) {

            Swal.fire({
                icon: "warning",
                title: "Periksa Data",
                text:
                    "Tarif lembur harus berupa angka."
            });

            return;

        }


        if (
            weekday < 0 ||
            weekend < 0
        ) {

            Swal.fire({
                icon: "warning",
                title: "Periksa Data",
                text:
                    "Tarif lembur tidak boleh kurang dari 0."
            });

            return;

        }


        try {

            setSaving(true);

            const response =
                await api.patch(
                    "/overtime/admin/settings",
                    {
                        weekday_rate: weekday,
                        weekend_rate: weekend
                    }
                );


            await Swal.fire({
                icon: "success",
                title: "Berhasil",
                text:
                    response.data?.message ||
                    "Pengaturan tarif lembur berhasil disimpan.",
                timer: 1500,
                showConfirmButton: false
            });


            await loadSettings();

        } catch (err) {

            console.error(
                "SAVE OVERTIME SETTINGS ERROR:",
                err
            );

            Swal.fire({
                icon: "error",
                title: "Gagal",
                text:
                    err.response?.data?.message ||
                    "Gagal menyimpan pengaturan tarif lembur."
            });

        } finally {

            setSaving(false);

        }

    };


    return (

        <Box>

            {/* ================================= */}
            {/* HEADER */}
            {/* ================================= */}

            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 0.5
                }}
            >

                <AccessTimeIcon />

                <Typography
                    variant="h5"
                    fontWeight={700}
                >
                    Pengaturan Overtime
                </Typography>

            </Box>


            <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3 }}
            >
                Atur tarif lembur berdasarkan hari kerja.
            </Typography>


            {/* ================================= */}
            {/* CARD */}
            {/* ================================= */}

            <Card
                sx={{
                    maxWidth: 700,
                    borderRadius: 2
                }}
            >

                <CardContent
                    sx={{
                        p: 3
                    }}
                >

                    <Typography
                        variant="h6"
                        fontWeight={600}
                        sx={{ mb: 0.5 }}
                    >
                        Tarif Lembur
                    </Typography>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 3 }}
                    >
                        Tarif digunakan untuk menghitung
                        nominal lembur secara proporsional
                        berdasarkan durasi lembur.
                    </Typography>


                    <Divider
                        sx={{ mb: 3 }}
                    />


                    <Stack
                        spacing={2.5}
                    >

                        {/* WEEKDAY */}

                        <Box>

                            <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{ mb: 1 }}
                            >
                                Senin - Jumat
                            </Typography>

                            <TextField
                                fullWidth
                                size="small"
                                type="text"
                                value={weekdayRate}
                                onChange={(e) =>
                                    setWeekdayRate(
                                        e.target.value
                                    )
                                }
                                disabled={loading}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment
                                            position="start"
                                        >
                                            Rp
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment
                                            position="end"
                                        >
                                            / jam
                                        </InputAdornment>
                                    )
                                }}
                            />

                        </Box>


                        {/* WEEKEND */}

                        <Box>

                            <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{ mb: 1 }}
                            >
                                Sabtu - Minggu
                            </Typography>

                            <TextField
                                fullWidth
                                size="small"
                                type="text"
                                value={weekendRate}
                                onChange={(e) =>
                                    setWeekendRate(
                                        e.target.value
                                    )
                                }
                                disabled={loading}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment
                                            position="start"
                                        >
                                            Rp
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment
                                            position="end"
                                        >
                                            / jam
                                        </InputAdornment>
                                    )
                                }}
                            />

                        </Box>


                        {/* SAVE */}

                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "flex-end",
                                pt: 1
                            }}
                        >

                            <Button
                                variant="contained"
                                startIcon={
                                    <SaveIcon />
                                }
                                onClick={
                                    handleSave
                                }
                                disabled={
                                    loading ||
                                    saving
                                }
                            >
                                {saving
                                    ? "Menyimpan..."
                                    : "Simpan Pengaturan"
                                }
                            </Button>

                        </Box>

                    </Stack>

                </CardContent>

            </Card>

        </Box>

    );

}