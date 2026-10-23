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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import WorkHistoryIcon from "@mui/icons-material/WorkHistory";

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
    const [openSection, setOpenSection] =
        useState("overtime");

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

            <Typography
                variant="h4"
                fontWeight={700}
                sx={{ mb: 0.5 }}
            >
                Pengaturan
            </Typography>

            <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3 }}
            >
                Kelola pengaturan sistem absensi dan lembur.
            </Typography>


            {/* ================================= */}
            {/* OVERTIME */}
            {/* ================================= */}

            <Card
                sx={{
                    borderRadius: 2,
                    mb: 2,
                    overflow: "hidden"
                }}
            >

                {/* HEADER CARD */}

                <Box
                    onClick={() =>
                        setOpenSection(
                            openSection === "overtime"
                                ? null
                                : "overtime"
                        )
                    }
                    sx={{
                        px: 2.5,
                        py: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",

                        "&:hover": {
                            backgroundColor: "action.hover"
                        }
                    }}
                >

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5
                        }}
                    >

                        <AccessTimeIcon />

                        <Typography
                            fontWeight={600}
                        >
                            Pengaturan Overtime
                        </Typography>

                    </Box>


                    {openSection === "overtime"
                        ? <ExpandLessIcon />
                        : <ExpandMoreIcon />
                    }

                </Box>


                {/* ================================= */}
                {/* CONTENT */}
                {/* ================================= */}

                {openSection === "overtime" && (

                    <Box
                        sx={{
                            borderTop: "1px solid",
                            borderColor: "divider",
                            px: 3,
                            py: 3,
                            maxWidth: 800
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

                            {/* SENIN - JUMAT */}

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
                                    onChange={(e) => {

                                        const value =
                                            e.target.value;

                                        const cleaned =
                                            value.replace(
                                                /\D/g,
                                                ""
                                            );

                                        setWeekdayRate(
                                            cleaned
                                                ? formatNumber(
                                                    cleaned
                                                )
                                                : ""
                                        );

                                    }}
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


                            {/* SABTU - MINGGU */}

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
                                    onChange={(e) => {

                                        const value =
                                            e.target.value;

                                        const cleaned =
                                            value.replace(
                                                /\D/g,
                                                ""
                                            );

                                        setWeekendRate(
                                            cleaned
                                                ? formatNumber(
                                                    cleaned
                                                )
                                                : ""
                                        );

                                    }}
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


                            {/* SIMPAN */}

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

                    </Box>

                )}

            </Card>


            {/* ================================= */}
            {/* JAM KERJA */}
            {/* ================================= */}

            <Card
                sx={{
                    borderRadius: 2,
                    mb: 2,
                    overflow: "hidden"
                }}
            >

                <Box
                    onClick={() =>
                        setOpenSection(
                            openSection === "working-hours"
                                ? null
                                : "working-hours"
                        )
                    }
                    sx={{
                        px: 2.5,
                        py: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",

                        "&:hover": {
                            backgroundColor: "action.hover"
                        }
                    }}
                >

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5
                        }}
                    >

                        <WorkHistoryIcon />

                        <Typography
                            fontWeight={600}
                        >
                            Pengaturan Jam Kerja
                        </Typography>

                    </Box>


                    {openSection === "working-hours"
                        ? <ExpandLessIcon />
                        : <ExpandMoreIcon />
                    }

                </Box>


                {openSection === "working-hours" && (

                    <Box
                        sx={{
                            borderTop: "1px solid",
                            borderColor: "divider",
                            px: 3,
                            py: 3
                        }}
                    >

                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            Pengaturan jam kerja akan
                            ditambahkan di sini.
                        </Typography>

                    </Box>

                )}

            </Card>


            {/* ================================= */}
            {/* ABSENSI */}
            {/* ================================= */}

            <Card
                sx={{
                    borderRadius: 2,
                    mb: 2,
                    overflow: "hidden"
                }}
            >

                <Box
                    sx={{
                        px: 2.5,
                        py: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                    }}
                >

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5
                        }}
                    >

                        <AccessTimeIcon />

                        <Typography
                            fontWeight={600}
                        >
                            Pengaturan Absensi
                        </Typography>

                    </Box>

                    <ExpandMoreIcon />

                </Box>

            </Card>

        </Box>
    );

}