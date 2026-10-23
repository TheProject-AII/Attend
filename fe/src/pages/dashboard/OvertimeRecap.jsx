import { useEffect, useState } from "react";

import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Paper,
    TextField,
    MenuItem,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack
} from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import PaymentsIcon from "@mui/icons-material/Payments";
import api from "../../services/api";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import DownloadIcon from "@mui/icons-material/Download";

const formatRupiah = (value) => {

    return new Intl.NumberFormat(
        "id-ID",
        {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(
        Number(value || 0)
    );

};

const formatTotalDuration = (
    hours,
    minutes
) => {

    if (
        Number(hours) === 0 &&
        Number(minutes) === 0
    ) {
        return "0 jam";
    }

    if (Number(hours) === 0) {
        return `${minutes} menit`;
    }

    if (Number(minutes) === 0) {
        return `${hours} jam`;
    }

    return `${hours} jam ${minutes} menit`;

};

export default function OvertimeRecap() {

    // =====================================
    // DATA
    // =====================================

    const [data, setData] = useState([]);

    const [loading, setLoading] =
        useState(false);


    // =====================================
    // FILTER
    // =====================================

    const [name, setName] =
        useState("");

    const [department, setDepartment] =
        useState("");

    const [startDate, setStartDate] =
        useState("");

    const [endDate, setEndDate] =
        useState("");


    // =====================================
    // SORTING
    // =====================================

    const [sort, setSort] =
        useState("latest");


    // =====================================
    // PAGINATION
    // =====================================

    const [page, setPage] =
        useState(1);

    const [limit, setLimit] =
        useState(10);

    const [pagination, setPagination] =
        useState({
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0
        });

    const [summary, setSummary] = useState({
        approved_count: 0,
        total_minutes: 0,
        total_hours: 0,
        total_remaining_minutes: 0,
        total_bill: 0,
        unpaid_bill: 0,
        paid_bill: 0
    });

    // =====================================
    // DETAIL
    // =====================================

    const [selectedItem, setSelectedItem] =
        useState(null);

    const getStatusLabel = (status) => {

        switch (status) {

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


    const getStatusColor = (status) => {

        switch (status) {

            case "APPROVED":
                return "success";

            case "REJECTED":
                return "error";

            case "PENDING_MANAGER":
                return "warning";

            case "CANCELLED":
                return "default";

            default:
                return "default";
        }

    };


    const formatDate = (date) => {

        if (!date) return "-";

        return new Date(date).toLocaleDateString(
            "id-ID",
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );

    };


    const formatDuration = (minutes) => {

        if (
            minutes === null ||
            minutes === undefined
        ) {
            return "-";
        }

        const hours =
            Math.floor(minutes / 60);

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

    // =====================================
    // LOAD DATA
    // =====================================

    const loadData = async () => {

        try {

            setLoading(true);

            const params = new URLSearchParams();

            params.append(
                "page",
                page
            );

            params.append(
                "limit",
                limit
            );

            params.append(
                "sort",
                sort
            );


            if (name.trim()) {

                params.append(
                    "name",
                    name.trim()
                );

            }


            if (department.trim()) {

                params.append(
                    "department",
                    department.trim()
                );

            }


            if (startDate) {

                params.append(
                    "start_date",
                    startDate
                );

            }


            if (endDate) {

                params.append(
                    "end_date",
                    endDate
                );

            }


            const response =
                await api.get(
                    `/overtime/admin/recap?${params.toString()}`
                );


            console.log(
                "OVERTIME RECAP:",
                response.data
            );


            setData(
                response.data.data || []
            );


            setPagination(
                response.data.pagination || {
                    page: 1,
                    limit: 10,
                    total: 0,
                    totalPages: 0
                }
            );

            setSummary(
                response.data.summary || {
                    approved_count: 0,
                    total_minutes: 0,
                    total_hours: 0,
                    total_remaining_minutes: 0,
                    total_bill: 0,
                    unpaid_bill: 0,
                    paid_bill: 0
                }
            );


        } catch (err) {

            console.error(
                "OVERTIME RECAP ERROR:",
                err
            );

        } finally {

            setLoading(false);

        }

    };


    useEffect(() => {

        loadData();

    }, [
        page,
        limit,
        sort,
        name,
        department,
        startDate,
        endDate
    ]);


    // =====================================
    // RESET FILTER
    // =====================================

    const handleReset = () => {

        setName("");

        setDepartment("");

        setStartDate("");

        setEndDate("");

        setSort("latest");

        setPage(1);

    };


    // =====================================
    // CHANGE LIMIT
    // =====================================

    const handleLimitChange = (e) => {

        setLimit(
            Number(e.target.value)
        );

        setPage(1);

    };


    const handleExportExcel = async () => {

        try {

            const params = new URLSearchParams();

            params.append("page", 1);
            params.append("limit", 100);
            params.append("sort", sort);

            if (name.trim()) {
                params.append(
                    "name",
                    name.trim()
                );
            }

            if (department.trim()) {
                params.append(
                    "department",
                    department.trim()
                );
            }

            if (startDate) {
                params.append(
                    "start_date",
                    startDate
                );
            }

            if (endDate) {
                params.append(
                    "end_date",
                    endDate
                );
            }

            const response = await api.get(
                `/overtime/admin/recap?${params.toString()}`
            );

            const exportRows =
                response.data?.data || [];

            if (exportRows.length === 0) {

                Swal.fire({
                    icon: "info",
                    title: "Tidak Ada Data",
                    text: "Tidak ada data lembur untuk diexport."
                });

                return;
            }

            const exportData = exportRows.map(
                (item, index) => ({
                    "No": index + 1,

                    "Nama Karyawan":
                        item.employee_name || "-",

                    "Divisi":
                        item.department || "-",

                    "Tanggal":
                        formatDate(
                            item.overtime_date
                        ),

                    "Jam Mulai":
                        item.start_time
                            ?.substring(0, 5) || "-",

                    "Jam Selesai":
                        item.end_time
                            ?.substring(0, 5) || "-",

                    "Durasi":
                        formatDuration(
                            item.duration_minutes
                        ),

                    "Tarif / Jam":
                        Number(
                            item.hourly_rate || 0
                        ),

                    "Nominal":
                        Number(
                            item.overtime_amount || 0
                        ),

                    "Status":
                        getStatusLabel(
                            item.status
                        ),

                    "Pembayaran":
                        item.status === "APPROVED"
                            ? item.payment_status === "PAID"
                                ? "Sudah Dibayar"
                                : "Belum Dibayar"
                            : "-",

                    "Pekerjaan":
                        item.reason || "-"
                })
            );

            const worksheet =
                XLSX.utils.json_to_sheet(
                    exportData
                );

            const workbook =
                XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "Rekap Lembur"
            );

            XLSX.writeFile(
                workbook,
                `Rekap_Lembur_${new Date()
                    .toISOString()
                    .slice(0, 10)}.xlsx`
            );

        } catch (err) {

            console.error(
                "EXPORT OVERTIME ERROR:",
                err
            );

            Swal.fire({
                icon: "error",
                title: "Gagal Export",
                text:
                    err.response?.data?.message ||
                    "Gagal export data lembur."
            });

        }

    };
    const handleMarkAsPaid = async (item) => {

        const confirm = await Swal.fire({
            icon: "question",
            title: "Konfirmasi Pembayaran",
            html: `
            Apakah lembur <b>${item.employee_name}</b>
            pada tanggal <b>${formatDate(item.overtime_date)}</b>
            sudah dibayarkan?
        `,
            showCancelButton: true,
            confirmButtonText: "Ya, Sudah Dibayar",
            cancelButtonText: "Batal"
        });

        if (!confirm.isConfirmed) {
            return;
        }

        try {

            const response = await api.patch(
                `/overtime/${item.id}/pay`
            );


            // =====================================
            // ALERT BERHASIL DULU
            // =====================================

            await Swal.fire({
                icon: "success",
                title: "Berhasil",
                text:
                    response.data?.message ||
                    "Pembayaran lembur berhasil dicatat.",
                confirmButtonText: "OK"
            });


            // =====================================
            // BARU REFRESH DATA
            // =====================================

            await loadData();


        } catch (err) {

            console.error(
                "MARK OVERTIME PAID ERROR:",
                err
            );

            Swal.fire({
                icon: "error",
                title: "Gagal",
                text:
                    err.response?.data?.message ||
                    "Pembayaran lembur gagal dicatat."
            });

        }

    };
    return (

        <Box>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, 1fr)",
                        md: "repeat(3, 1fr)",
                        lg: "repeat(5, 1fr)"
                    },
                    gap: 2,
                    mb: 2
                }}
            >

                {/* ============================== */}
                {/* LEMBUR DISETUJUI */}
                {/* ============================== */}

                <Card
                    sx={{
                        height: "100%"
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
                            sx={{ mt: 0.5 }}
                        >
                            {summary.approved_count}
                        </Typography>

                    </CardContent>
                </Card>


                {/* ============================== */}
                {/* TOTAL JAM */}
                {/* ============================== */}

                <Card
                    sx={{
                        height: "100%"
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
                            sx={{ mt: 0.5 }}
                        >
                            {formatTotalDuration(
                                summary.total_hours,
                                summary.total_remaining_minutes
                            )}
                        </Typography>

                    </CardContent>
                </Card>


                {/* ============================== */}
                {/* TOTAL TAGIHAN */}
                {/* ============================== */}

                <Card
                    sx={{
                        height: "100%"
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
                            sx={{ mt: 0.5 }}
                        >
                            {formatRupiah(
                                summary.total_bill
                            )}
                        </Typography>

                    </CardContent>
                </Card>


                {/* ============================== */}
                {/* BELUM DIBAYAR */}
                {/* ============================== */}

                <Card
                    sx={{
                        height: "100%"
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
                            sx={{ mt: 0.5 }}
                        >
                            {formatRupiah(
                                summary.unpaid_bill
                            )}
                        </Typography>

                    </CardContent>
                </Card>


                {/* ============================== */}
                {/* SUDAH DIBAYAR */}
                {/* ============================== */}

                <Card
                    sx={{
                        height: "100%"
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
                            sx={{ mt: 0.5 }}
                        >
                            {formatRupiah(
                                summary.paid_bill
                            )}
                        </Typography>

                    </CardContent>
                </Card>

            </Box>
            {/* ================================= */}
            {/* FILTER DATA */}
            {/* ================================= */}

            <Card
                sx={{
                    mb: 2,
                    borderRadius: 2
                }}
            >

                <CardContent>

                    <Stack
                        direction={{
                            xs: "column",
                            md: "row"
                        }}
                        spacing={2}
                    >

                        {/* NAMA */}

                        <TextField
                            fullWidth
                            size="small"
                            label="Nama Karyawan"
                            value={name}
                            onChange={(e) => {

                                setName(
                                    e.target.value
                                );

                                setPage(1);

                            }}
                            placeholder="Cari nama..."
                            InputProps={{
                                startAdornment:
                                    <SearchIcon
                                        fontSize="small"
                                        sx={{
                                            mr: 1,
                                            color: "text.secondary"
                                        }}
                                    />
                            }}
                        />


                        {/* DIVISI */}

                        <TextField
                            fullWidth
                            size="small"
                            label="Divisi"
                            value={department}
                            onChange={(e) => {

                                setDepartment(
                                    e.target.value
                                );

                                setPage(1);

                            }}
                            placeholder="Contoh: IT"
                        />


                        {/* START DATE */}

                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Dari Tanggal"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setPage(1);
                            }}
                            slotProps={{
                                inputLabel: {
                                    shrink: true
                                }
                            }}
                        />


                        {/* END DATE */}

                        <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Sampai Tanggal"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setPage(1);
                            }}
                            slotProps={{
                                inputLabel: {
                                    shrink: true
                                }
                            }}
                        />

                    </Stack>


                    <Stack
                        direction={{
                            xs: "column",
                            sm: "row"
                        }}
                        spacing={2}
                        sx={{ mt: 2 }}
                    >

                        {/* SORT */}

                        <TextField
                            select
                            size="small"
                            label="Urutan"
                            value={sort}
                            onChange={(e) => {

                                setSort(
                                    e.target.value
                                );

                                setPage(1);

                            }}
                            sx={{
                                minWidth: 180
                            }}
                        >

                            <MenuItem value="latest">
                                Terbaru
                            </MenuItem>

                            <MenuItem value="oldest">
                                Terlama
                            </MenuItem>

                        </TextField>


                        <Button
                            variant="outlined"
                            startIcon={
                                <RefreshIcon />
                            }
                            onClick={
                                handleReset
                            }
                        >
                            Reset Filter
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={handleExportExcel}
                            sx={{
                                minWidth: 150,
                                textTransform: "none",
                                whiteSpace: "nowrap"
                            }}
                        >
                            Export Excel
                        </Button>
                    </Stack>

                </CardContent>

            </Card>


            {/* ================================= */}
            {/* TABLE */}
            {/* ================================= */}

            <Card
                sx={{
                    borderRadius: 2
                }}
            >

                <CardContent>

                    <TableContainer
                        component={Paper}
                        elevation={0}
                        sx={{
                            overflowX: "auto"
                        }}
                    >

                        <Table
                            sx={{
                                minWidth: 950
                            }}
                        >

                            <TableHead>

                                <TableRow>
                                    <TableCell>
                                        No.
                                    </TableCell>
                                    <TableCell>
                                        Karyawan
                                    </TableCell>

                                    <TableCell>
                                        Divisi
                                    </TableCell>

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

                                    <TableCell align="center">
                                        Aksi
                                    </TableCell>

                                </TableRow>

                            </TableHead>


                            <TableBody>

                                {loading ? (

                                    <TableRow>

                                        <TableCell
                                            colSpan={10}
                                            align="center"
                                            sx={{
                                                py: 5
                                            }}
                                        >
                                            Memuat data...
                                        </TableCell>

                                    </TableRow>

                                ) : data.length === 0 ? (

                                    <TableRow>

                                        <TableCell
                                            colSpan={8}
                                            align="center"
                                            sx={{
                                                py: 5
                                            }}
                                        >
                                            Tidak ada data lembur.
                                        </TableCell>

                                    </TableRow>

                                ) : (

                                    data.map(
                                        (item, index) => (

                                            <TableRow
                                                key={item.id}
                                                hover
                                            >
                                                <TableCell align="center">
                                                    {index + 1}
                                                </TableCell>
                                                <TableCell>
                                                    {
                                                        item.employee_name ||
                                                        "-"
                                                    }
                                                </TableCell>


                                                <TableCell>
                                                    {
                                                        item.department ||
                                                        "-"
                                                    }
                                                </TableCell>


                                                <TableCell>
                                                    {
                                                        formatDate(
                                                            item.overtime_date
                                                        )
                                                    }
                                                </TableCell>


                                                <TableCell>
                                                    {
                                                        item.start_time?.substring(
                                                            0,
                                                            5
                                                        )
                                                    }

                                                    {" - "}

                                                    {
                                                        item.end_time?.substring(
                                                            0,
                                                            5
                                                        )
                                                    }
                                                </TableCell>


                                                <TableCell>
                                                    {
                                                        formatDuration(
                                                            item.duration_minutes
                                                        )
                                                    }
                                                </TableCell>

                                                <TableCell>
                                                    {formatRupiah(item.hourly_rate)}
                                                </TableCell>

                                                <TableCell>
                                                    {formatRupiah(item.overtime_amount)}
                                                </TableCell>
                                                <TableCell>

                                                    <Chip
                                                        label={
                                                            getStatusLabel(
                                                                item.status
                                                            )
                                                        }
                                                        size="small"
                                                        color={
                                                            getStatusColor(
                                                                item.status
                                                            )
                                                        }
                                                    />

                                                </TableCell>


                                                <TableCell>

                                                    {
                                                        item.status ===
                                                            "APPROVED"
                                                            ? (

                                                                <Chip
                                                                    label={
                                                                        item.payment_status ===
                                                                            "PAID"
                                                                            ? "Sudah Dibayar"
                                                                            : "Belum Dibayar"
                                                                    }
                                                                    size="small"
                                                                    color={
                                                                        item.payment_status ===
                                                                            "PAID"
                                                                            ? "success"
                                                                            : "warning"
                                                                    }
                                                                />

                                                            )
                                                            : (
                                                                "-"
                                                            )
                                                    }

                                                </TableCell>


                                                <TableCell
                                                    align="center"
                                                >
                                                    <Stack
                                                        direction="row"
                                                        spacing={0.5}
                                                        justifyContent="center"
                                                    >

                                                        {/* DETAIL */}

                                                        <IconButton
                                                            size="small"
                                                            onClick={() =>
                                                                setSelectedItem(item)
                                                            }
                                                            title="Lihat Detail"
                                                        >
                                                            <VisibilityIcon
                                                                fontSize="small"
                                                            />
                                                        </IconButton>


                                                        {/* BAYAR */}

                                                        {item.status === "APPROVED" &&
                                                            item.payment_status === "UNPAID" && (

                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    color="success"
                                                                    onClick={() =>
                                                                        handleMarkAsPaid(item)
                                                                    }
                                                                    sx={{
                                                                        minWidth: 70,
                                                                        height: 32,
                                                                        textTransform: "none"
                                                                    }}
                                                                >
                                                                    Bayar
                                                                </Button>

                                                            )}

                                                    </Stack>
                                                </TableCell>

                                            </TableRow>

                                        )
                                    )

                                )}

                            </TableBody>

                        </Table>

                    </TableContainer>


                    {/* ================================= */}
                    {/* PAGINATION */}
                    {/* ================================= */}

                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            width: "100%",
                            mt: 2,
                            pb: 1
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 1.5,
                                minHeight: 40
                            }}
                        >

                            {/* TOTAL DATA */}

                            <Box
                                sx={{
                                    height: 40,
                                    display: "flex",
                                    alignItems: "center",
                                    whiteSpace: "nowrap"
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{
                                        lineHeight: 1
                                    }}
                                >
                                    Total data:{" "}
                                    <strong>
                                        {pagination.total}
                                    </strong>
                                </Typography>
                            </Box>


                            {/* PER HALAMAN */}

                            <TextField
                                select
                                size="small"
                                label="Per halaman"
                                value={limit}
                                onChange={handleLimitChange}
                                sx={{
                                    width: 145,

                                    "& .MuiInputBase-root": {
                                        height: 40
                                    }
                                }}
                            >
                                <MenuItem value={10}>
                                    10
                                </MenuItem>

                                <MenuItem value={25}>
                                    25
                                </MenuItem>

                                <MenuItem value={50}>
                                    50
                                </MenuItem>
                            </TextField>


                            {/* SEBELUMNYA */}

                            <Button
                                variant="outlined"
                                disabled={page <= 1}
                                onClick={() =>
                                    setPage(page - 1)
                                }
                                sx={{
                                    minWidth: 125,
                                    height: 40,
                                    whiteSpace: "nowrap"
                                }}
                            >
                                Sebelumnya
                            </Button>


                            {/* PAGE */}

                            <Box
                                sx={{
                                    height: 40,
                                    minWidth: 55,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{
                                        lineHeight: 1,
                                        fontWeight: 500
                                    }}
                                >
                                    {pagination.totalPages === 0
                                        ? "0 / 0"
                                        : `${page} / ${pagination.totalPages}`
                                    }
                                </Typography>
                            </Box>


                            {/* BERIKUTNYA */}

                            <Button
                                variant="outlined"
                                disabled={
                                    page >=
                                    pagination.totalPages
                                }
                                onClick={() =>
                                    setPage(page + 1)
                                }
                                sx={{
                                    minWidth: 125,
                                    height: 40,
                                    whiteSpace: "nowrap"
                                }}
                            >
                                Berikutnya
                            </Button>

                        </Box>
                    </Box>

                </CardContent>

            </Card>


            {/* ================================= */}
            {/* DETAIL DIALOG */}
            {/* ================================= */}

            <Dialog
                open={
                    Boolean(selectedItem)
                }
                onClose={() =>
                    setSelectedItem(null)
                }
                fullWidth
                maxWidth="sm"
            >

                <DialogTitle>
                    Detail Lembur
                </DialogTitle>


                <DialogContent>

                    {selectedItem && (

                        <Stack
                            spacing={1.5}
                            sx={{
                                pt: 1
                            }}
                        >

                            <Typography>
                                <strong>
                                    Karyawan:
                                </strong>{" "}
                                {
                                    selectedItem.employee_name ||
                                    "-"
                                }
                            </Typography>


                            <Typography>
                                <strong>
                                    Divisi:
                                </strong>{" "}
                                {
                                    selectedItem.department ||
                                    "-"
                                }
                            </Typography>


                            <Typography>
                                <strong>
                                    Tanggal:
                                </strong>{" "}
                                {
                                    formatDate(
                                        selectedItem.overtime_date
                                    )
                                }
                            </Typography>


                            <Typography>
                                <strong>
                                    Jam:
                                </strong>{" "}
                                {
                                    selectedItem.start_time?.substring(
                                        0,
                                        5
                                    )
                                }

                                {" - "}

                                {
                                    selectedItem.end_time?.substring(
                                        0,
                                        5
                                    )
                                }
                            </Typography>


                            <Typography>
                                <strong>
                                    Durasi:
                                </strong>{" "}
                                {
                                    formatDuration(
                                        selectedItem.duration_minutes
                                    )
                                }
                            </Typography>


                            <Typography>
                                <strong>
                                    Status:
                                </strong>{" "}
                                {
                                    getStatusLabel(
                                        selectedItem.status
                                    )
                                }
                            </Typography>


                            <Typography>
                                <strong>
                                    Pembayaran:
                                </strong>{" "}
                                {
                                    selectedItem.status ===
                                        "APPROVED"
                                        ? selectedItem.payment_status ===
                                            "PAID"
                                            ? "Sudah Dibayar"
                                            : "Belum Dibayar"
                                        : "-"
                                }
                            </Typography>


                            <Box>

                                <Typography
                                    fontWeight={600}
                                    sx={{
                                        mb: 0.5
                                    }}
                                >
                                    Pekerjaan
                                </Typography>


                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 1,
                                        bgcolor:
                                            "action.hover"
                                    }}
                                >

                                    <Typography
                                        variant="body2"
                                    >
                                        {
                                            selectedItem.reason ||
                                            "-"
                                        }
                                    </Typography>

                                </Box>

                            </Box>

                        </Stack>

                    )}

                </DialogContent>


                <DialogActions>

                    <Button
                        onClick={() =>
                            setSelectedItem(null)
                        }
                    >
                        Tutup
                    </Button>

                </DialogActions>

            </Dialog>

        </Box>

    );

}