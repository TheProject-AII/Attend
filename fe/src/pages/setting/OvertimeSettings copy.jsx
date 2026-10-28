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
                    Overtime Settings
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SaveIcon from "@mui/icons-material/Save";

import Swal from "sweetalert2";

import api from "../../services/api";
                Set overtime rates by workday.
const formatNumber = (value) => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
                        Overtime Rates
    }

    return new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: 0
    }).format(Number(value));
};
                        Overtime pay is calculated proportionally based on the
                        duration of overtime.
        String(value)
            .replace(/\./g, "")
            .replace(",", ".")
    );
};

                                Monday - Friday

    const [weekdayRate, setWeekdayRate] =
        useState("");

                                            / hour
        useState("");

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
                                Saturday - Sunday


    // =====================================
    // LOAD SETTINGS
                                            / hour

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
                                {saving
                                    ? "Saving..."
                                    : "Save Settings"
            );

        } catch (err) {

            console.error(
                "LOAD OVERTIME SETTINGS ERROR:",
                err
            );

            Swal.fire({
                icon: "error",
                title: "Failed",
                text:
                    err.response?.data?.message ||
                    "Failed to load overtime rate settings."
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
                title: "Check the Data",
                text:
                    "Overtime rates must be numbers."
            });

            return;

        }


        if (
            weekday < 0 ||
            weekend < 0
        ) {

            Swal.fire({
                icon: "warning",
                title: "Check the Data",
                text:
                    "Overtime rates cannot be less than 0."
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
                title: "Success",
                text:
                    response.data?.message ||
                    "Overtime rate settings saved successfully.",
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
                title: "Failed",
                text:
                    err.response?.data?.message ||
                    "Failed to save overtime rate settings."
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
                    Overtime Settings
                </Typography>

            </Box>


            <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3 }}
            >
                Set overtime rates by workday.
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
                        Overtime Rates
                    </Typography>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 3 }}
                    >
                        Overtime pay is calculated proportionally based on the
                        duration of overtime.
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
                                Monday - Friday
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
                                            / hour
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
                                Saturday - Sunday
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
                                            / hour
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
                                    ? "Saving..."
                                    : "Save Settings"
                                }
                            </Button>

                        </Box>

                    </Stack>

                </CardContent>

            </Card>

        </Box>

    );

}