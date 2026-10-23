import {
    Card,
    CardContent,
    Typography,
    Chip,
    Stack,
    Box
} from "@mui/material";

const leaveTypeLabel = {
    SAKIT: "Sakit",
    IZIN: "Izin",
    CUTI: "Cuti",
    DINAS: "Dinas",
    BUSINESS_TRIP: "Perjalanan Dinas",
    CLIENT: "Client",
    MEETING: "Meeting",
    WFH: "WFH",
    LEMBUR: "Lembur"
};

const getStatusLabel = (status) => {

    switch (status) {

        case "PENDING":
        case "PENDING_SUPERVISOR":
        case "PENDING_MANAGER":
            return "Menunggu";

        case "APPROVED":
            return "Disetujui";

        case "REJECTED":
            return "Ditolak";

        case "CANCELLED":
            return "Dibatalkan";

        default:
            return status || "-";
    }
};

export default function LeaveCard({
    item,
    onClick
}) {

    const isOvertime =
        item.leave_type === "LEMBUR";

    const formatDate = (date) => {

        if (!date) return "-";

        return new Date(date).toLocaleDateString(
            "id-ID",
            {
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );

    };

    const formatTime = (time) => {

        if (!time) return "-";

        return time.substring(0, 5);

    };

    const formatDuration = (minutes) => {

        if (
            minutes === undefined ||
            minutes === null
        ) {
            return "-";
        }

        const hours = Math.floor(
            minutes / 60
        );

        const remainingMinutes =
            minutes % 60;

        if (hours === 0) {
            return `${remainingMinutes} menit`;
        }

        if (remainingMinutes === 0) {
            return `${hours} jam`;
        }

        return `${hours} jam ${remainingMinutes} menit`;

    };



    return (

        <Card
            onClick={onClick}
            sx={{
                mb: 2,
                borderRadius: 1,
                cursor: "pointer",
                transition: ".2s",

                "&:hover": {
                    transform: "translateY(-2px)"
                }
            }}
        >

            <CardContent>

                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                >

                    <Typography
                        sx={{
                            flex: 1,
                            fontWeight: 700,
                            color: "primary.main",
                            lineHeight: 1.4
                        }}
                    >
                        {item.leave_type === "CUTI"
                            ? item.leave_category === "TAHUNAN"
                                ? "Cuti Tahunan"
                                : item.leave_category === "MENIKAH"
                                    ? "Cuti Menikah"
                                    : item.leave_category === "MELAHIRKAN"
                                        ? "Cuti Melahirkan"
                                        : item.leave_category === "KELUARGA_MENINGGAL"
                                            ? "Cuti Keluarga Meninggal"
                                            : "Cuti"
                            : leaveTypeLabel[item.leave_type] ||
                            item.leave_type
                        }
                    </Typography>

                    <Chip
                        label={getStatusLabel(item.status)}
                        size="small"
                        color={
                            item.status === "APPROVED"
                                ? "success"
                                : item.status === "REJECTED"
                                    ? "error"
                                    : "warning"
                        }
                    />

                </Stack>


                {/* ===================== */}
                {/* LEMBUR */}
                {/* ===================== */}

                {isOvertime ? (

                    <Box sx={{ mt: 1.5 }}>

                        <Typography
                            variant="body2"
                        >
                            <strong>
                                Tanggal :
                            </strong>{" "}
                            {formatDate(
                                item.overtime_date
                            )}
                        </Typography>

                        <Typography
                            variant="body2"
                        >
                            <strong>
                                Jam :
                            </strong>{" "}
                            {formatTime(
                                item.start_time
                            )}
                            {" - "}
                            {formatTime(
                                item.end_time
                            )}
                        </Typography>

                        <Typography
                            variant="body2"
                        >
                            <strong>
                                Durasi :
                            </strong>{" "}
                            {formatDuration(
                                item.duration_minutes
                            )}
                        </Typography>

                        <Typography
                            variant="body2"
                        >
                            <strong>
                                Pekerjaan :
                            </strong>{" "}
                            {item.reason || "-"}
                        </Typography>

                    </Box>

                ) : (

                    /* ===================== */
                    /* CUTI / IZIN / SAKIT */
                    /* ===================== */

                    <Box sx={{ mt: 1.5 }}>

                        <Typography
                            variant="body2"
                            sx={{ mb: 0 }}
                        >
                            <strong>
                                Tanggal :
                            </strong>{" "}
                            {formatDate(
                                item.start_date
                            )}
                            {" - "}
                            {formatDate(
                                item.end_date
                            )}
                        </Typography>

                        <Typography
                            variant="body2"
                            sx={{ mb: 0 }}
                        >
                            <strong>
                                Durasi :
                            </strong>{" "}
                            {
                                Math.max(
                                    1,
                                    Math.ceil(
                                        (
                                            new Date(
                                                item.end_date
                                            ) -
                                            new Date(
                                                item.start_date
                                            )
                                        ) /
                                        86400000
                                    ) + 1
                                )
                            } Hari
                        </Typography>

                        <Typography variant="body2">

                            <strong>
                                Keterangan :
                            </strong>{" "}

                            {item.reason || "-"}

                        </Typography>

                    </Box>

                )}

            </CardContent>

        </Card>

    );

}