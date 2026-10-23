import {
    Paper,
    Typography,
    Button,
    Box,
    Grid
} from "@mui/material";

import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

export default function HeroCard({
    time,
    status,
    insideRadius,
    loading,
    todayData,
    onOpenAttendance,
    gpsReady,
    refreshingLocation,
    onRetryLocation,

}) {
    const getStatusMessage = () => {

        const day = time.getDay();

        // 1. Sudah check out
        if (status === "checked-out") {
            return "✅ Sudah Absen Pulang";
        }

        // 2. Weekend (tidak bergantung GPS)
        if (day === 0 || day === 6) {
            return "🎉 Selamat menikmati waktu istirahat di akhir pekan";
        }

        // 3. Sedang bekerja
        if (status === "checked-in") {
            return "🟢 Sedang Bekerja";
        }

        // 4. GPS belum siap
        if (insideRadius === null) {
            return "📍 Sedang mendapatkan lokasi...";
        }

        // 5. Dalam area kantor
        if (insideRadius) {
            return "🟢 Sudah siap untuk absen?";
        }

        // 6. Di luar area
        return "🔴 Kamu berada di luar area kantor";
    };

    const formatTimeJam = (value) => {
        if (!value) return "-";

        const date =
            value instanceof Date
                ? value
                : new Date(value);

        if (isNaN(date.getTime())) {
            return "-";
        }

        return date.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    };

    const formatTimeWIB = (dateString) => {
        if (!dateString) return "-";

        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) return "-";

        return new Intl.DateTimeFormat("id-ID", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23"
        }).format(date);
    };

    return (

        <Paper
            elevation={0}
            sx={{
                borderRadius: "0 0 5px 5px",
                overflow: "hidden",
                background: "#0e7d63",
                color: "#fff",
                p: 2.5,
            }}
        >
            {!gpsReady && (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        mb: 1
                    }}
                >
                    <Tooltip
                        title={
                            gpsReady
                                ? "Perbarui Lokasi"
                                : "GPS belum aktif"
                        }
                    >
                        <IconButton
                            onClick={onRetryLocation}
                            disabled={refreshingLocation}
                            sx={{
                                color: "#fff",
                                width: 38,
                                height: 38,
                                bgcolor: "rgba(255,255,255,.10)",

                                "&:hover": {
                                    bgcolor: "rgba(255,255,255,.18)",
                                }
                            }}
                        >
                            <RefreshRoundedIcon
                                sx={{
                                    fontSize: 22,
                                    animation: refreshingLocation
                                        ? "spin .8s linear infinite"
                                        : "none",

                                    "@keyframes spin": {
                                        from: {
                                            transform: "rotate(0deg)"
                                        },
                                        to: {
                                            transform: "rotate(360deg)"
                                        }
                                    }
                                }}
                            />
                        </IconButton>
                    </Tooltip>
                </Box>)}
            {/* JAM */}

            <Typography
                sx={{
                    fontSize: 28,
                    fontWeight: 700,
                    textAlign: "center",
                    lineHeight: 1,
                }}
            >
                {formatTimeJam(time)}
            </Typography>

            {/* TANGGAL */}

            <Typography
                sx={{
                    mt: 1,
                    textAlign: "center",
                    opacity: .9,
                }}
            >
                {time.toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                })}
            </Typography>

            {/* STATUS */}

            <Box
                sx={{
                    mt: 2,
                    mb: 2,
                    textAlign: "center"
                }}
            >

                <Typography
                    fontWeight={600}
                    fontSize={17}
                >
                    {getStatusMessage()}
                </Typography>

            </Box>

            {/* INFO CARD */}

            <Grid
                container
                spacing={2}
                sx={{
                    mb: 2
                }}
            >

                {/* CHECK IN */}

                <Grid size={6}>

                    <Paper
                        elevation={0}
                        sx={{
                            height: 85,
                            borderRadius: 2,
                            p: 1.5,

                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",

                            bgcolor: "rgba(255,255,255,.08)",
                            border: "1px solid rgba(255,255,255,.08)",
                            boxShadow: "none",
                            backdropFilter: "blur(10px)",
                            color: "#fff"
                        }}
                    >

                        <LoginRoundedIcon
                            sx={{
                                fontSize: 24,
                                color: "#ffffff"
                            }}
                        />

                        <Typography
                            variant="body2"
                            sx={{ mt: .5 }}
                        >
                            Check In
                        </Typography>

                        <Typography
                            fontWeight={700}
                            fontSize={18}
                        >
                            {formatTimeWIB(todayData?.checkIn || null)}
                        </Typography>

                    </Paper>

                </Grid>

                {/* CHECK OUT */}

                <Grid size={6}>

                    <Paper
                        elevation={0}
                        sx={{
                            height: 85,
                            borderRadius: 2,
                            p: 1.5,

                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",

                            bgcolor: "rgba(255,255,255,.08)",
                            border: "1px solid rgba(255,255,255,.08)",
                            boxShadow: "none",
                            backdropFilter: "blur(10px)",
                            color: "#fff"
                        }}
                    >

                        <LogoutRoundedIcon
                            sx={{
                                fontSize: 24,
                                color: todayData?.checkOut
                                    ? "#ffff"
                                    : "#EF4444"
                            }}
                        />

                        <Typography
                            variant="body2"
                            sx={{ mt: .5 }}
                        >
                            Check Out
                        </Typography>

                        <Typography
                            fontWeight={700}
                            fontSize={18}
                        >
                            {
                                formatTimeWIB(todayData?.checkOut || null)
                            }
                        </Typography>

                    </Paper>

                </Grid>

                {/* TOTAL */}

                <Grid size={12}>

                    <Paper
                        elevation={0}
                        sx={{
                            height: 70,
                            borderRadius: 2,
                            p: 1.5,

                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",

                            bgcolor: "rgba(255,255,255,.08)",
                            border: "1px solid rgba(255,255,255,.08)",
                            boxShadow: "none",
                            backdropFilter: "blur(10px)",
                            color: "#fff"
                        }}
                    >

                        <AccessTimeRoundedIcon
                            sx={{
                                fontSize: 22,
                                color: "#ffffff"
                            }}
                        />

                        <Typography
                            variant="body2"
                            sx={{ mt: .5 }}
                        >
                            Total Kerja
                        </Typography>

                        <Typography
                            fontWeight={700}
                            fontSize={17}
                        >
                            {todayData?.workingHours || "-"}
                        </Typography>

                    </Paper>

                </Grid>

            </Grid>

            {/* BUTTON */}



            <Button
                fullWidth
                size="large"
                variant="contained"
                sx={{
                    mt: 1,
                    py: 1.3,
                    borderRadius: 2,
                    fontWeight: 700,
                    bgcolor: "#ffffff",
                    color: "#0F766E",
                    "&:hover": {
                        bgcolor: "#F3F4F6"
                    }
                }}
                disabled={!gpsReady || loading || status === "checked-out"}

                onClick={onOpenAttendance}
            >

                {
                    loading
                        ? "Memproses..."
                        : status === "checked-in"
                            ? "Absen Pulang"
                            : status === "checked-out"
                                ? "Sudah Check Out"
                                : insideRadius
                                    ? "Absen Masuk"
                                    : "Absen Luar Kantor"
                }

            </Button>

        </Paper>

    );

}