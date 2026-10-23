import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    MenuItem,
    Stack,
    Typography,
    Skeleton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert
} from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { IconButton } from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";


import attendanceService from "../../services/attService";

export default function History() {
    const [editDialog, setEditDialog] = useState(null);
    const [editForm, setEditForm] = useState({
        check_in: "",
        check_out: "",
        reason: ""
    });

    const [submittingEdit, setSubmittingEdit] = useState(false);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const selectedMonth = selectedDate.getMonth();
    const selectedYear = selectedDate.getFullYear();
    const now = new Date();
    const isCurrentMonth =
        selectedMonth === now.getMonth() &&
        selectedYear === now.getFullYear();
    const monthNames = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember"
    ];

    const prevMonth = () => {

        setSelectedDate(prev => {

            const d = new Date(prev);

            d.setMonth(d.getMonth() - 1);

            return d;

        });

    };

    const nextMonth = () => {

        setSelectedDate(prev => {

            const d = new Date(prev);

            d.setMonth(d.getMonth() + 1);

            return d;

        });

    };



    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {

        try {

            setLoading(true);

            const result = await attendanceService.getHistory();

            setHistory(result.data);

        } catch (err) {

            console.error(err);

        } finally {

            setLoading(false);

        }

    };

    const formatTime = (time) => {
        if (!time) return "-";

        return new Date(time).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });

    };

    const formatInputTime = (time) => {
        if (!time) return "";

        const date = new Date(time);

        return `${String(date.getHours()).padStart(2, "0")}:${String(
            date.getMinutes()
        ).padStart(2, "0")}`;
    };

    const openEditDialog = (item) => {
        setEditDialog(item);

        setEditForm({
            check_in: formatInputTime(item.check_in),
            check_out: formatInputTime(item.check_out),
            reason: ""
        });
    };



    const filteredHistory = useMemo(() => {

        return history.filter(item => {

            const date = new Date(item.attendance_date);

            return (
                date.getMonth() === selectedMonth &&
                date.getFullYear() === selectedYear
            );

        });

    }, [history, selectedMonth, selectedYear]);

    const summary = useMemo(() => {

        return {

            hadir: filteredHistory.length,

            terlambat: filteredHistory.filter(
                x => x.attendance_status === "Terlambat"
            ).length,

            tepatWaktu: filteredHistory.filter(
                x => x.attendance_status === "Tepat Waktu"
            ).length

        };

    }, [filteredHistory]);

    const isValidTime = (value) => {
        if (!/^\d{2}:\d{2}$/.test(value)) {
            return false;
        }

        const [hour, minute] = value.split(":").map(Number);

        return (
            hour >= 0 &&
            hour <= 23 &&
            minute >= 0 &&
            minute <= 59
        );
    };

    const buildDateTime = (date, time) => {
        if (!time) return null;

        const dateOnly = new Date(date)
            .toLocaleDateString("en-CA");

        return `${dateOnly} ${time}:00`;
    };

    const submitEditRequest = async () => {

        if (!editDialog) return;

        if (!editForm.reason.trim()) {
            alert("Alasan perubahan wajib diisi.");
            return;
        }

        if (
            editForm.check_in &&
            !isValidTime(editForm.check_in)
        ) {
            alert("Jam masuk harus dalam format HH:mm, contoh 13:57.");
            return;
        }

        if (
            editForm.check_out &&
            !isValidTime(editForm.check_out)
        ) {
            alert("Jam pulang harus dalam format HH:mm, contoh 17:00.");
            return;
        }

        try {

            setSubmittingEdit(true);

            const attendanceDate =
                editDialog.attendance_date;

            const newCheckIn = buildDateTime(
                editDialog.attendance_date,
                editForm.check_in
            );

            const newCheckOut = buildDateTime(
                editDialog.attendance_date,
                editForm.check_out
            );

            console.log("EDIT REQUEST PAYLOAD", {
                attendance_id: editDialog.id,
                new_check_in: newCheckIn,
                new_check_out: newCheckOut,
                reason: editForm.reason
            });

            await attendanceService.createEditRequest({
                attendance_id: editDialog.id,
                new_check_in: newCheckIn,
                new_check_out: newCheckOut,
                reason: editForm.reason
            });

            setEditDialog(null);

            setEditForm({
                check_in: "",
                check_out: "",
                reason: ""
            });

            await loadHistory();

        } catch (err) {

            console.error(err);

            alert(
                err.response?.data?.message ||
                "Gagal mengajukan perubahan absensi."
            );

        } finally {

            setSubmittingEdit(false);

        }
    };

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
                    top: 0,
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
                        background: "linear-gradient(135deg,#0e7d63,#17a673)",
                        color: "#fff"
                    }}
                >
                    <CardContent>

                        <Typography
                            variant="h5"
                            fontWeight={700}
                        >
                            Riwayat Absensi
                        </Typography>


                        <Box
                            sx={{
                                mt: 2,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                bgcolor: "#fff",
                                borderRadius: 3,
                                px: 1,
                                py: .5,
                                color: "#000",
                                boxShadow: "0 2px 8px rgba(0,0,0,.04)"
                            }}
                        >

                            <IconButton onClick={prevMonth}>
                                <ChevronLeftRoundedIcon />
                            </IconButton>

                            <Typography
                                fontWeight={700}
                                fontSize={18}

                            >
                                {monthNames[selectedMonth]} {selectedYear}
                            </Typography>

                            <IconButton
                                onClick={nextMonth}
                                disabled={isCurrentMonth}
                            >
                                <ChevronRightRoundedIcon />
                            </IconButton>

                        </Box>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: .5, textAlign: "center" }}
                        >
                            {summary.hadir} Hari Hadir | {summary.terlambat} Terlambat | {summary.tepatWaktu} Tepat Waktu
                        </Typography>


                    </CardContent>
                </Card>




            </Box>

            <Stack
                spacing={2} sx={{ px: 2, pt: 2, pb: 10 }}

            >

                {loading ? (

                    [...Array(4)].map((_, index) => (

                        <Card
                            key={index}
                            sx={{
                                borderRadius: 1
                            }}
                        >
                            <CardContent>

                                <Skeleton
                                    width="60%"
                                    height={30}
                                />

                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(3,1fr)",
                                        gap: 2,
                                        mt: 2,
                                        textAlign: "center"
                                    }}
                                >

                                    {[1, 2, 3].map((i) => (

                                        <Box key={i}>

                                            <Skeleton
                                                width={55}
                                                height={32}
                                                sx={{ mx: "auto" }}
                                            />

                                            <Skeleton
                                                width={70}
                                                height={18}
                                                sx={{ mx: "auto" }}
                                            />

                                        </Box>

                                    ))}

                                </Box>

                            </CardContent>
                        </Card>

                    ))

                ) : filteredHistory.length === 0 ? (

                    <Card
                        sx={{
                            borderRadius: 1
                        }}
                    >
                        <CardContent>

                            <Typography
                                align="center"
                                color="text.secondary"
                            >
                                Belum ada riwayat absensi.
                            </Typography>

                        </CardContent>
                    </Card>

                ) : (

                    filteredHistory.map(item => (

                        <Card
                            key={item.id}
                            elevation={2}
                            sx={{
                                borderRadius: 1
                            }}
                        >

                            <CardContent>

                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        mb: 2,
                                        gap: 2
                                    }}
                                >

                                    <Typography
                                        sx={{
                                            flex: 1,
                                            fontWeight: 700,
                                            color: "primary.main",
                                            lineHeight: 1.4
                                        }}
                                    >
                                        {new Date(item.attendance_date).toLocaleDateString("id-ID", {
                                            weekday: "long",
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric"
                                        })}
                                    </Typography>

                                    {item.attendance_status === "Terlambat" ? (
                                        <Chip
                                            label={`Terlambat ${item.late_minutes} Menit`}
                                            color="error"
                                            size="small"
                                        />
                                    ) : (
                                        <Chip
                                            label="Tepat Waktu"
                                            color="success"
                                            size="small"
                                        />
                                    )}

                                </Box>

                                {/* <Divider sx={{ mb: 2 }} /> */}

                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(3,1fr)",
                                        gap: 2,
                                        textAlign: "center"
                                    }}
                                >

                                    <Box>

                                        {/* <LoginIcon
                                        color="success"
                                        sx={{ mb: .5 }}
                                    /> */}

                                        <Typography
                                            fontWeight={700}
                                            fontSize={20}
                                        >
                                            {formatTime(item.check_in)}
                                        </Typography>

                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            Check In
                                        </Typography>

                                    </Box>

                                    <Box>

                                        {/* <LogoutIcon
                                        color="error"
                                        sx={{ mb: .5 }}
                                    /> */}

                                        <Typography
                                            fontWeight={700}
                                            fontSize={20}
                                        >
                                            {formatTime(item.check_out)}
                                        </Typography>

                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            Check Out
                                        </Typography>

                                    </Box>

                                    <Box>

                                        {/* <ScheduleIcon
                                        color="primary"
                                        sx={{ mb: .5 }}
                                    /> */}

                                        <Typography
                                            fontWeight={700}
                                            fontSize={20}
                                        >
                                            {item.working_hours || "-"}
                                        </Typography>

                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            Durasi
                                        </Typography>

                                    </Box>

                                </Box>
                                <Box
                                    sx={{
                                        mt: 2,
                                        display: "flex",
                                        justifyContent: "flex-end"
                                    }}
                                >

                                    {item.edit_request_status === "PENDING_SUPERVISOR" ? (

                                        <Chip
                                            label="Menunggu Approval"
                                            color="warning"
                                            size="small"
                                        />

                                    ) : item.edit_request_status === "APPROVED" ? (

                                        <Chip
                                            label="Sudah Dikoreksi"
                                            color="success"
                                            size="small"
                                        />

                                    ) : (

                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<EditRoundedIcon />}
                                            onClick={() => openEditDialog(item)}
                                        >
                                            Ajukan Perubahan
                                        </Button>

                                    )}
                                </Box>

                            </CardContent>

                        </Card>

                    ))

                )}





            </Stack>

            <Dialog
                open={Boolean(editDialog)}
                onClose={() => {
                    if (!submittingEdit) {
                        setEditDialog(null);
                    }
                }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle
                    fontWeight={700}
                >
                    Ajukan Perubahan Absensi
                </DialogTitle>

                <DialogContent>

                    {editDialog && (
                        <Stack spacing={2} sx={{ mt: 1 }}>

                            <Typography
                                fontWeight={600}
                            >
                                {new Date(
                                    editDialog.attendance_date
                                ).toLocaleDateString("id-ID", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric"
                                })}
                            </Typography>

                            <TextField
                                fullWidth
                                label="Jam Masuk"
                                placeholder="HH:mm"
                                value={editForm.check_in}
                                onChange={(e) => {
                                    const value = e.target.value;

                                    if (/^\d{0,2}:?\d{0,2}$/.test(value)) {
                                        setEditForm(prev => ({
                                            ...prev,
                                            check_in: value
                                        }));
                                    }
                                }}
                                helperText="Format 24 jam, contoh: 13:57"
                            />

                            <TextField
                                fullWidth
                                label="Jam Pulang"
                                placeholder="HH:mm"
                                value={editForm.check_out}
                                onChange={(e) => {
                                    const value = e.target.value;

                                    if (/^\d{0,2}:?\d{0,2}$/.test(value)) {
                                        setEditForm(prev => ({
                                            ...prev,
                                            check_out: value
                                        }));
                                    }
                                }}
                                helperText="Format 24 jam, contoh: 17:00"
                            />
                            <TextField
                                fullWidth
                                multiline
                                minRows={3}
                                label="Alasan Perubahan"
                                placeholder="Jelaskan alasan perubahan jam absensi..."
                                value={editForm.reason}
                                onChange={(e) =>
                                    setEditForm(prev => ({
                                        ...prev,
                                        reason: e.target.value
                                    }))
                                }
                            />

                        </Stack>
                    )}

                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>

                    <Button
                        onClick={() => setEditDialog(null)}
                        disabled={submittingEdit}
                    >
                        Batal
                    </Button>

                    <Button
                        variant="contained"
                        color="success"
                        onClick={submitEditRequest}
                        disabled={
                            submittingEdit ||
                            !editForm.reason.trim()
                        }
                    >
                        {submittingEdit
                            ? "Mengirim..."
                            : "Ajukan Perubahan"}
                    </Button>

                </DialogActions>

            </Dialog>

        </Box>

    );

}