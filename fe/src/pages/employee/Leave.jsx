import { useEffect, useState, useMemo } from "react";

import leaveService from "../../services/leaveService";
import LeaveDialog from "../../components/attendance/LeaveDialog";
import LeaveDetailDialog from "../../components/layout/LeaveDetailDialog";
import LeaveCard from "../../components/layout/LeaveCard";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Fab,
    Stack,
    Skeleton
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import Swal from "sweetalert2";
import notificationService from "../../services/notificationService";
import overtimeService from "../../services/overtimeService";
import OvertimeDetailDialog from "../../components/layout/OvertimeDetailDialog";

export default function Leave() {

    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [leaveType, setLeaveType] = useState("SAKIT");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [reason, setReason] = useState("");
    const [attachment, setAttachment] = useState(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [cutiType, setCutiType] = useState("TAHUNAN");

    const [openDetail, setOpenDetail] = useState(false);
    const [openOvertimeDetail, setOpenOvertimeDetail] =
        useState(false);
    const [summary, setSummary] = useState({
        leave_balance: 0,
        cuti_taken_days: 0,
        sick_deduction_days: 0,
        special_leave_days: 0
    });

    const [statusFilter, setStatusFilter] = useState("ALL");
    const normalizeStatus = (status) => {

        if (!status) {
            return "";
        }

        const value = status.toString().toUpperCase();

        if (
            value === "PENDING" ||
            value === "PENDING_SUPERVISOR" ||
            value === "PENDING_MANAGER"
        ) {
            return "PENDING";
        }

        if (value === "APPROVED") {
            return "APPROVED";
        }

        if (
            value === "REJECTED" ||
            value === "REJECT"
        ) {
            return "REJECTED";
        }

        if (value === "CANCELLED") {
            return "CANCELLED";
        }

        return value;
    };

    const filteredHistory = useMemo(() => {

        console.log("FILTER DIPILIH:", statusFilter);

        console.log(
            "STATUS DATA:",
            history.map(item => ({
                id: item.id,
                type: item.leave_type,
                status: item.status
            }))
        );

        if (statusFilter === "ALL") {
            return history;
        }

        const result = history.filter((item) => {

            return normalizeStatus(item.status) ===
                normalizeStatus(statusFilter);

        });

        console.log("HASIL FILTER:", result);

        return result;

    }, [history, statusFilter]);

    const statusCount = useMemo(() => ({

        ALL: history.length,

        PENDING: history.filter(
            item =>
                normalizeStatus(item.status) ===
                "PENDING"
        ).length,

        APPROVED: history.filter(
            item =>
                normalizeStatus(item.status) ===
                "APPROVED"
        ).length,

        REJECTED: history.filter(
            item =>
                normalizeStatus(item.status) ===
                "REJECTED"
        ).length,

        CANCELLED: history.filter(
            item =>
                normalizeStatus(item.status) ===
                "CANCELLED"
        ).length

    }), [history]);

    useEffect(() => {

        loadHistory();
        const markNotificationsAsRead = async () => {

            try {

                await notificationService.readResult();

            } catch (err) {

                console.error(
                    "Gagal membaca notification:",
                    err
                );

            }

        };

        markNotificationsAsRead();

    }, []);

    const loadHistory = async () => {
        try {
            setLoading(true);

            const [leaveResult, overtimeResult] =
                await Promise.all([
                    leaveService.history(),
                    overtimeService.history(),
                ]);

            const leaveData =
                leaveResult.data?.data ||
                leaveResult.data ||
                [];

            setSummary({
                leave_balance:
                    leaveResult.data?.summary?.leave_balance ?? 0,

                cuti_taken_days:
                    leaveResult.data?.summary?.cuti_taken_days ?? 0,

                sick_deduction_days:
                    leaveResult.data?.summary?.sick_deduction_days ?? 0,

                special_leave_days:
                    leaveResult.data?.summary?.special_leave_days ?? 0
            });

            const overtimeData =
                overtimeResult.data?.data ||
                overtimeResult.data ||
                [];

            const overtimeHistory =
                overtimeData.map((item) => ({
                    ...item,

                    // supaya gampang dibedakan
                    leave_type: "LEMBUR",

                    // sesuaikan field yang dipakai
                    // komponen history lu
                    start_date: item.overtime_date,
                    end_date: item.overtime_date,

                    // keterangan
                    reason: item.reason,

                    // tambahan khusus lembur
                    start_time: item.start_time,
                    end_time: item.end_time,

                    duration_minutes:
                        item.duration_minutes,
                }));

            const combinedHistory = [
                ...leaveData,
                ...overtimeHistory
            ].sort((a, b) => {

                const dateA = new Date(
                    a.leave_type === "LEMBUR"
                        ? a.overtime_date
                        : a.start_date
                );

                const dateB = new Date(
                    b.leave_type === "LEMBUR"
                        ? b.overtime_date
                        : b.start_date
                );

                return dateB - dateA;
            });

            setHistory(combinedHistory);



        } catch (err) {

            console.error(
                "LOAD HISTORY ERROR:",
                err
            );

        } finally {

            setLoading(false);

        }
    };

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

    const leaveTypeLabel = {

        SAKIT: "Sakit",
        IZIN: "Izin",
        CUTI: "Cuti",
        DINAS: "Dinas",
        BUSINESS_TRIP: "Perjalanan Dinas",
        CLIENT: "Kunjungan Client",
        MEETING: "Meeting",
        WFH: "Work From Home"

    };

    const handleSubmit = async () => {

        // =====================================
        // VALIDASI UMUM
        // =====================================

        if (!startDate) {
            Swal.fire({
                icon: "warning",
                title: "Tanggal belum lengkap"
            });

            return;
        }

        if (!reason.trim()) {
            Swal.fire({
                icon: "warning",
                title: "Keterangan wajib diisi"
            });

            return;
        }

        // =====================================
        // KHUSUS LEMBUR
        // =====================================

        if (leaveType === "LEMBUR") {

            if (!startTime || !endTime) {

                Swal.fire({
                    icon: "warning",
                    title: "Jam lembur belum lengkap",
                    text: "Jam mulai dan jam selesai wajib diisi."
                });

                return;
            }

            if (endTime === startTime) {
                Swal.fire({
                    icon: "warning",
                    title: "Jam lembur tidak valid",
                    text: "Jam mulai dan jam selesai tidak boleh sama."
                });

                return;
            }

            try {

                setSubmitLoading(true);

                await overtimeService.create({
                    overtime_date: startDate,
                    start_time: startTime,
                    end_time: endTime,
                    reason: reason
                });


                setOpenDialog(false);
                await Swal.fire({
                    icon: "success",
                    title: "Berhasil",
                    text: "Pengajuan lembur berhasil dikirim."
                });

                // RESET FORM

                setLeaveType("SAKIT");

                setStartDate("");
                setEndDate("");

                setStartTime("");
                setEndTime("");

                setReason("");
                setAttachment(null);

                // Untuk sementara history leave
                // belum memuat lembur.
                // Nanti kita gabungkan di tahap history.

            } catch (err) {

                console.error(err);

                Swal.fire({
                    icon: "error",
                    title: "Gagal",
                    text:
                        err.response?.data?.message ||
                        "Gagal mengajukan lembur."
                });

            } finally {

                setSubmitLoading(false);

            }

            return;
        }

        // =====================================
        // CUTI / IZIN / SAKIT
        // =====================================

        if (!endDate) {

            Swal.fire({
                icon: "warning",
                title: "Tanggal belum lengkap"
            });

            return;
        }

        // if (leaveType === "SAKIT" && !attachment) {

        //     Swal.fire({
        //         icon: "warning",
        //         title: "Lampiran Wajib",
        //         text: "Pengajuan sakit wajib melampirkan surat dokter."
        //     });

        //     return;
        // }

        try {

            setSubmitLoading(true);

            const formData = new FormData();

            formData.append(
                "leave_type",
                leaveType
            );
            if (leaveType === "CUTI") {
                formData.append(
                    "leave_category",
                    cutiType
                );
            }

            formData.append(
                "start_date",
                startDate
            );

            formData.append(
                "end_date",
                endDate
            );

            formData.append(
                "reason",
                reason
            );

            if (attachment) {

                formData.append(
                    "attachment",
                    attachment
                );

            }

            await leaveService.create(
                formData
            );
            // Tutup dialog pengajuan dulu
            setOpenDialog(false);

            // Baru tampilkan SweetAlert
            await Swal.fire({
                icon: "success",
                title: "Berhasil",
                text: "Pengajuan berhasil dikirim.",
                confirmButtonText: "OK",
            });
            setLeaveType("SAKIT");

            setStartDate("");
            setEndDate("");

            setStartTime("");
            setEndTime("");

            setReason("");
            setAttachment(null);

            loadHistory();

        } catch (err) {

            Swal.fire({
                icon: "error",
                title: "Gagal",
                text:
                    err.response?.data?.message ||
                    "Terjadi kesalahan."
            });

        } finally {

            setSubmitLoading(false);

        }
    };

    const chipStyle = (value) => ({
        borderRadius: 5,
        px: 0.5,
        transition: ".2s",
        transform:
            statusFilter === value
                ? "scale(1.05)"
                : "scale(1)"
    });

    return (

        <Box
            sx={{
                bgcolor: "#f5f7fb",
                minHeight: "100vh"
            }}
        >

            {/* Header */}
            <Box
                sx={{
                    position: "sticky",
                    top: 8,
                    zIndex: 1000,
                    bgcolor: "#F5F7FA",
                    px: 2,
                    pt: 2,
                    pb: 2,
                    borderBottom: "1px solid #ECEFF1",
                    boxShadow: "0 2px 10px rgba(0,0,0,.05)"
                }}
            >
                <Card
                    sx={{
                        mb: 3,
                        background:
                            "linear-gradient(135deg,#0e7d63,#17a673)",
                        color: "#fff"
                    }}
                >
                    <CardContent>

                        <Typography
                            variant="h5"
                            fontWeight={700}
                            sx={{ mb: 2 }}
                        >
                            Pengajuan
                        </Typography>

                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                    xs: "1fr 1fr",
                                    sm: "repeat(4, 1fr)"
                                },
                                gap: 2
                            }}
                        >

                            {/* SISA CUTI */}

                            <Box>
                                <Typography
                                    variant="body2"
                                    sx={{ opacity: 0.85 }}
                                >
                                    Sisa Cuti Tahunan
                                </Typography>

                                <Typography
                                    variant="h5"
                                    fontWeight={700}
                                >
                                    {summary.leave_balance} Hari
                                </Typography>
                            </Box>


                            {/* CUTI DIAMBIL */}

                            <Box>
                                <Typography
                                    variant="body2"
                                    sx={{ opacity: 0.85 }}
                                >
                                    Cuti Diambil
                                </Typography>

                                <Typography
                                    variant="h5"
                                    fontWeight={700}
                                >
                                    {summary.cuti_taken_days} Hari
                                </Typography>
                            </Box>


                            {/* SAKIT POTONG CUTI */}

                            <Box>
                                <Typography
                                    variant="body2"
                                    sx={{ opacity: 0.85 }}
                                >
                                    Sakit Potong Cuti
                                </Typography>

                                <Typography
                                    variant="h5"
                                    fontWeight={700}
                                >
                                    {summary.sick_deduction_days} Hari
                                </Typography>
                            </Box>


                            {/* CUTI KHUSUS */}

                            <Box>
                                <Typography
                                    variant="body2"
                                    sx={{ opacity: 0.85 }}
                                >
                                    Cuti Khusus
                                </Typography>

                                <Typography
                                    variant="h5"
                                    fontWeight={700}
                                >
                                    {summary.special_leave_days} Hari
                                </Typography>
                            </Box>

                        </Box>

                    </CardContent>
                </Card>

                <Box
                    sx={{
                        overflowX: "auto",
                        pb: 2,

                        "&::-webkit-scrollbar": {
                            display: "none"
                        },

                        scrollbarWidth: "none"
                    }}
                >
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                            width: "max-content"
                        }}
                    >
                        <Chip
                            label={`Semua (${statusCount.ALL})`}
                            sx={{ gap: 1 }}
                            clickable
                            color={statusFilter === "ALL" ? "primary" : "default"}
                            onClick={() => setStatusFilter("ALL")}
                        />

                        <Chip
                            label={`Pending (${statusCount.PENDING})`}
                            clickable

                            sx={chipStyle("PENDING_SUPERVISOR")}
                            color={statusFilter === "PENDING_SUPERVISOR" ? "warning" : "default"}
                            onClick={() => setStatusFilter("PENDING_SUPERVISOR")}
                        />

                        <Chip
                            label={`Approved (${statusCount.APPROVED})`}
                            clickable
                            sx={chipStyle("APPROVED")}
                            color={statusFilter === "APPROVED" ? "success" : "default"}
                            onClick={() => setStatusFilter("APPROVED")}
                        />

                        <Chip
                            label={`Rejected (${statusCount.REJECTED})`}
                            clickable
                            sx={chipStyle("REJECTED")}
                            color={statusFilter === "REJECTED" ? "error" : "default"}
                            onClick={() => setStatusFilter("REJECTED")}
                        />

                        <Chip

                            label={`Cancelled (${statusCount.CANCELLED})`}

                            clickable
                            sx={{ gap: 1 }}
                            color={
                                statusFilter === "CANCELLED"
                                    ? "primary"
                                    : "default"
                            }

                            onClick={() =>
                                setStatusFilter("CANCELLED")
                            }

                        /></Stack>  </Box>
            </Box>
            <Box
                sx={{
                    px: 2,
                    pt: 2,
                    pb: 12
                }}
            >
                {

                    loading ?

                        [...Array(4)].map((_, index) => (

                            <Card
                                key={index}
                                sx={{
                                    mb: 2,
                                    borderRadius: 3
                                }}
                            >

                                <CardContent>

                                    <Box
                                        display="flex"
                                        justifyContent="space-between"
                                        alignItems="center"
                                    >

                                        <Skeleton
                                            variant="text"
                                            width={130}
                                            height={28}
                                        />

                                        <Skeleton
                                            variant="rounded"
                                            width={90}
                                            height={28}
                                        />

                                    </Box>

                                    <Skeleton
                                        variant="text"
                                        width="70%"
                                        height={24}
                                        sx={{ mt: 1 }}
                                    />

                                    <Skeleton
                                        variant="text"
                                        width="90%"
                                        height={18}
                                        sx={{ mt: .5 }}
                                    />

                                </CardContent>

                            </Card>

                        ))

                        :

                        filteredHistory.length === 0 ?

                            <Card
                                sx={{
                                    borderRadius: 3
                                }}
                            >

                                <CardContent>

                                    <Typography
                                        align="center"
                                        color="text.secondary"
                                    >
                                        Belum ada riwayat pengajuan.
                                    </Typography>

                                </CardContent>

                            </Card>

                            :

                            filteredHistory.map(item => (

                                <LeaveCard

                                    key={`${item.leave_type}-${item.id}`}

                                    item={item}

                                    onClick={() => {

                                        setSelectedLeave(item);

                                        if (item.leave_type === "LEMBUR") {

                                            setOpenOvertimeDetail(true);

                                        } else {

                                            setOpenDetail(true);

                                        }

                                    }}

                                />

                            ))

                }
            </Box>
            <Fab
                color="primary"
                onClick={() => setOpenDialog(true)}
                sx={{
                    position: "fixed",
                    bottom: 85,
                    right: 20,
                    bgcolor: "#0e7d63",

                    "&:hover": {

                        bgcolor: "#0a6a54"

                    }

                }}
            >

                <AddRoundedIcon />

            </Fab>
            <LeaveDialog
                startTime={startTime}
                setStartTime={setStartTime}
                cutiType={cutiType}
                setCutiType={setCutiType}
                endTime={endTime}
                setEndTime={setEndTime}
                open={openDialog}
                onClose={() => {

                    setOpenDialog(false);

                    setLeaveType("SAKIT");

                    setStartDate("");

                    setEndDate("");

                    setStartTime("");
                    setEndTime("");


                    setReason("");

                    setAttachment(null);

                }}

                leaveType={leaveType}
                setLeaveType={setLeaveType}

                startDate={startDate}
                setStartDate={setStartDate}

                endDate={endDate}
                setEndDate={setEndDate}
                reason={reason}
                setReason={setReason}
                attachment={attachment}
                setAttachment={setAttachment}
                loading={submitLoading}

                onSubmit={handleSubmit}
            />
            <LeaveDetailDialog

                open={openDetail}

                onClose={() => setOpenDetail(false)}

                data={selectedLeave}

            />
            <OvertimeDetailDialog
                open={openOvertimeDetail}
                onClose={() => setOpenOvertimeDetail(false)}
                data={selectedLeave}
            />
        </Box>

    );

}