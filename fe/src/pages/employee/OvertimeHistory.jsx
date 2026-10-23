import { useEffect, useState } from "react";

import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Stack,
} from "@mui/material";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";

import overtimeService from "../../services/overtimeService";


const formatRupiah = (value) => {

    return new Intl.NumberFormat(
        "id-ID",
        {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }
    ).format(
        Number(value || 0)
    );

};


const formatDuration = (minutes) => {

    const total =
        Number(minutes || 0);

    const hours =
        Math.floor(total / 60);

    const remaining =
        total % 60;

    if (hours === 0) {
        return `${remaining} menit`;
    }

    if (remaining === 0) {
        return `${hours} jam`;
    }

    return `${hours} jam ${remaining} menit`;

};


const formatDate = (date) => {

    if (!date) return "-";

    return new Date(
        `${date}T00:00:00`
    ).toLocaleDateString(
        "id-ID",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }
    );

};


const getStatusLabel = (status) => {

    switch (status) {

        case "PENDING_SUPERVISOR":
            return "Menunggu Supervisor";

        case "PENDING_MANAGER":
            return "Menunggu Manager";

        case "APPROVED":
            return "Disetujui";

        case "REJECTED":
            return "Ditolak";

        default:
            return status || "-";

    }

};


const getStatusColor = (status) => {

    switch (status) {

        case "APPROVED":
            return "success";

        case "REJECTED":
            return "error";

        case "PENDING_SUPERVISOR":
        case "PENDING_MANAGER":
            return "warning";

        default:
            return "default";

    }

};


const getPaymentLabel = (status) => {

    if (status === "PAID") {
        return "Sudah Dibayar";
    }

    return "Belum Dibayar";

};


const getPaymentColor = (status) => {

    return status === "PAID"
        ? "success"
        : "warning";

};


export default function OvertimeHistory() {

    const [data, setData] =
        useState([]);

    const [summary, setSummary] =
        useState({
            approved_count: 0,
            total_minutes: 0,
            total_hours: 0,
            total_remaining_minutes: 0,
            total_bill: 0,
            unpaid_bill: 0,
            paid_bill: 0,
        });

    const [loading, setLoading] =
        useState(true);


    // =====================================
    // LOAD DATA
    // =====================================

    const loadData = async () => {

        try {

            setLoading(true);

            const result =
                await overtimeService.myRecap();

            setData(
                result.data || []
            );

            setSummary(
                result.summary || {
                    approved_count: 0,
                    total_minutes: 0,
                    total_hours: 0,
                    total_remaining_minutes: 0,
                    total_bill: 0,
                    unpaid_bill: 0,
                    paid_bill: 0,
                }
            );

        } catch (err) {

            console.error(
                "LOAD MY OVERTIME ERROR:",
                err
            );

        } finally {

            setLoading(false);

        }

    };


    useEffect(() => {

        loadData();

    }, []);


    // =====================================
    // LOADING
    // =====================================

    if (loading) {

        return (

            <Box
                sx={{
                    minHeight: "50vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >

                <CircularProgress />

            </Box>

        );

    }


    return (

        <Box
            sx={{
                p: 2,
            }}
        >

            {/* ================================= */}
            {/* HEADER */}
            {/* ================================= */}

            <Box
                sx={{
                    mb: 3,
                }}
            >

                <Typography
                    variant="h5"
                    fontWeight={700}
                >
                    Rekap Lembur
                </Typography>

                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        mt: 0.5,
                    }}
                >
                    Riwayat pengajuan dan pembayaran lembur Anda.
                </Typography>

            </Box>


            {/* ================================= */}
            {/* SUMMARY */}
            {/* ================================= */}

            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, 1fr)",
                        md: "repeat(3, 1fr)",
                        lg: "repeat(5, 1fr)",
                    },
                    gap: 2,
                    mb: 3,
                }}
            >

                {/* DISETUJUI */}

                <Card
                    sx={{
                        height: "100%",
                    }}
                >

                    <CardContent>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            Lembur Disetujui
                        </Typography>

                        <Typography
                            variant="h5"
                            fontWeight={700}
                            sx={{
                                mt: 0.5,
                            }}
                        >
                            {summary.approved_count}
                        </Typography>

                    </CardContent>

                </Card>


                {/* TOTAL JAM */}

                <Card
                    sx={{
                        height: "100%",
                    }}
                >

                    <CardContent>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            Total Jam Lembur
                        </Typography>

                        <Typography
                            variant="h5"
                            fontWeight={700}
                            sx={{
                                mt: 0.5,
                            }}
                        >
                            {formatDuration(
                                summary.total_minutes
                            )}
                        </Typography>

                    </CardContent>

                </Card>


                {/* TOTAL TAGIHAN */}

                <Card
                    sx={{
                        height: "100%",
                    }}
                >

                    <CardContent>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            Total Tagihan
                        </Typography>

                        <Typography
                            variant="h5"
                            fontWeight={700}
                            sx={{
                                mt: 0.5,
                            }}
                        >
                            {formatRupiah(
                                summary.total_bill
                            )}
                        </Typography>

                    </CardContent>

                </Card>


                {/* BELUM DIBAYAR */}

                <Card
                    sx={{
                        height: "100%",
                    }}
                >

                    <CardContent>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            Belum Dibayar
                        </Typography>

                        <Typography
                            variant="h5"
                            fontWeight={700}
                            sx={{
                                mt: 0.5,
                            }}
                        >
                            {formatRupiah(
                                summary.unpaid_bill
                            )}
                        </Typography>

                    </CardContent>

                </Card>


                {/* SUDAH DIBAYAR */}

                <Card
                    sx={{
                        height: "100%",
                    }}
                >

                    <CardContent>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            Sudah Dibayar
                        </Typography>

                        <Typography
                            variant="h5"
                            fontWeight={700}
                            sx={{
                                mt: 0.5,
                            }}
                        >
                            {formatRupiah(
                                summary.paid_bill
                            )}
                        </Typography>

                    </CardContent>

                </Card>

            </Box>


            {/* ================================= */}
            {/* TABLE */}
            {/* ================================= */}

            <Card>

                <CardContent
                    sx={{
                        p: 0,
                        "&:last-child": {
                            pb: 0,
                        },
                    }}
                >

                    <TableContainer
                        component={Paper}
                        elevation={0}
                    >

                        <Table>

                            <TableHead>

                                <TableRow>

                                    <TableCell>
                                        Tanggal
                                    </TableCell>

                                    <TableCell>
                                        Jam
                                    </TableCell>

                                    <TableCell>
                                        Durasi
                                    </TableCell>

                                    <TableCell>
                                        Tarif / Jam
                                    </TableCell>

                                    <TableCell>
                                        Nominal
                                    </TableCell>

                                    <TableCell>
                                        Status
                                    </TableCell>

                                    <TableCell>
                                        Pembayaran
                                    </TableCell>

                                    <TableCell>
                                        Pekerjaan
                                    </TableCell>

                                </TableRow>

                            </TableHead>


                            <TableBody>

                                {data.length === 0 ? (

                                    <TableRow>

                                        <TableCell
                                            colSpan={8}
                                            align="center"
                                            sx={{
                                                py: 6,
                                            }}
                                        >

                                            <AccessTimeRoundedIcon
                                                sx={{
                                                    fontSize: 40,
                                                    color: "text.disabled",
                                                    mb: 1,
                                                }}
                                            />

                                            <Typography
                                                color="text.secondary"
                                            >
                                                Belum ada riwayat lembur.
                                            </Typography>

                                        </TableCell>

                                    </TableRow>

                                ) : (

                                    data.map(
                                        (item) => (

                                            <TableRow
                                                key={item.id}
                                                hover
                                            >

                                                <TableCell>
                                                    {formatDate(
                                                        item.overtime_date
                                                    )}
                                                </TableCell>


                                                <TableCell>
                                                    {item.start_time?.substring(0, 5)}
                                                    {" - "}
                                                    {item.end_time?.substring(0, 5)}
                                                </TableCell>


                                                <TableCell>
                                                    {formatDuration(
                                                        item.duration_minutes
                                                    )}
                                                </TableCell>


                                                <TableCell>
                                                    {formatRupiah(
                                                        item.hourly_rate
                                                    )}
                                                </TableCell>


                                                <TableCell>
                                                    <Typography
                                                        fontWeight={600}
                                                    >
                                                        {formatRupiah(
                                                            item.overtime_amount
                                                        )}
                                                    </Typography>
                                                </TableCell>


                                                <TableCell>

                                                    <Chip
                                                        size="small"
                                                        label={getStatusLabel(
                                                            item.status
                                                        )}
                                                        color={getStatusColor(
                                                            item.status
                                                        )}
                                                    />

                                                </TableCell>


                                                <TableCell>

                                                    {item.status === "APPROVED" ? (

                                                        <Chip
                                                            size="small"
                                                            label={getPaymentLabel(
                                                                item.payment_status
                                                            )}
                                                            color={getPaymentColor(
                                                                item.payment_status
                                                            )}
                                                        />

                                                    ) : (

                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                        >
                                                            -
                                                        </Typography>

                                                    )}

                                                </TableCell>


                                                <TableCell
                                                    sx={{
                                                        maxWidth: 250,
                                                    }}
                                                >

                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                        title={
                                                            item.reason || "-"
                                                        }
                                                    >
                                                        {item.reason || "-"}
                                                    </Typography>

                                                </TableCell>

                                            </TableRow>

                                        )
                                    )

                                )}

                            </TableBody>

                        </Table>

                    </TableContainer>

                </CardContent>

            </Card>

        </Box>

    );

}