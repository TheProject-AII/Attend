import {
    Box,
    Card,
    CardContent,
    Typography,
    Divider,
    Button,
    Stack,
    TextField,
    Skeleton
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import { useEffect, useState } from "react";
import {
    useNavigate,
    useParams,
    useLocation
} from "react-router-dom";

import leaderService from "../../services/leaderService";
import Drawer from "@mui/material/Drawer";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

export default function ApprovalDetail() {

    const { id } = useParams();

    const navigate = useNavigate();
    const location = useLocation();

    const isAttendanceEdit =
        location.pathname.includes("/approval/attendance/");

    const [detail, setDetail] = useState(null);

    const [loading, setLoading] = useState(true);

    const [action, setAction] = useState(null);
    // "APPROVE" | "REJECT"

    const [note, setNote] = useState("");

    const [saving, setSaving] = useState(false);
    const [deductLeave, setDeductLeave] = useState(false);
    const [snackbar, setSnackbar] = useState({

        open: false,

        severity: "success",

        message: ""

    });

    const loadDetail = async () => {

        try {

            const { data } = isAttendanceEdit
                ? await leaderService.getAttendanceEditDetail(id)
                : await leaderService.getLeaveDetail(id);

            setDetail(data.data);

        } catch (err) {

            console.error(err);

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        loadDetail();

    }, [id, isAttendanceEdit]);

    const formatDate = (date) =>
        new Date(date).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });

    const formatDateRange = (start, end) => {

        const startFormatted = formatDate(start);
        const endFormatted = formatDate(end);

        if (startFormatted === endFormatted) {
            return startFormatted;
        }

        return `${startFormatted} - ${endFormatted}`;

    };

    const getDuration = (start, end) => {

        const s = new Date(start);

        const e = new Date(end);

        return (
            Math.ceil(
                (e - s) / (1000 * 60 * 60 * 24)
            ) + 1
        );

    };

    if (loading) {

        return (

            <Box p={2}>

                <Skeleton height={50} />

                <Skeleton
                    height={120}
                    sx={{ mt: 2 }}
                />

                <Skeleton
                    height={250}
                    sx={{ mt: 2 }}
                />

            </Box>

        );

    }

    const handleSubmit = async () => {

        try {

            setSaving(true);

            if (isAttendanceEdit) {

                if (action === "APPROVE") {

                    await leaderService.approveAttendanceEdit(
                        id,
                        note,
                    );

                } else {

                    await leaderService.rejectAttendanceEdit(
                        id,
                        note
                    );

                }

            } else {

                if (action === "APPROVE") {

                    await leaderService.approve(
                        id,
                        note,
                        detail.leave_type === "SAKIT"
                            ? deductLeave
                            : false
                    );

                } else {

                    await leaderService.reject(
                        id,
                        note
                    );

                }

            }

            setSnackbar({

                open: true,

                severity: "success",

                message:
                    action === "APPROVE"

                        ? "Pengajuan berhasil disetujui."

                        : "Pengajuan berhasil ditolak."

            });
            setAction(null);

            setTimeout(() => {

                navigate("/employee/approval");

            }, 2000);

        } catch (err) {

            alert(
                err.response?.data?.message ||
                "Terjadi kesalahan."
            );

        } finally {

            setSaving(false);

        }

    };

    const formatTime = (date) => {
        if (!date) return "-";

        return new Date(date).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <Box
            sx={{
                height: "100%"
            }}
        >
            <Box
                sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 20,
                    bgcolor: "#F5F7FA",
                    px: 2,
                    py: 1,
                    borderBottom: "1px solid #E5E7EB"
                }}
            >

                <Typography
                    variant="h5"
                    fontWeight={700}
                >
                    Detail Approval
                </Typography>

            </Box>
            <Box
                sx={{
                    p: 2,
                    pt: 1,
                    pb: 12 // supaya tidak ketutup Bottom Navigation
                }}
            >

                <Card
                    sx={{
                        mt: 2,
                    }}
                >

                    <CardContent>
                        <InfoItem
                            title="Nama Karyawan"
                            value={<>
                                <Typography fontWeight={600}>
                                    {detail.name}
                                </Typography>

                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    {detail.department} • {detail.position}
                                </Typography>
                            </>}
                        />
                        {!isAttendanceEdit && (
                            <>
                                <Divider sx={{ my: 2 }} />

                                <InfoItem
                                    title="Jenis Pengajuan"
                                    value={detail.leave_type}
                                />

                                <Divider sx={{ my: 2 }} />

                                <InfoItem
                                    title="Tanggal"
                                    value={formatDateRange(
                                        detail.start_date,
                                        detail.end_date
                                    )}
                                />

                                <Divider sx={{ my: 2 }} />

                                <InfoItem
                                    title="Durasi"
                                    value={`${detail.leave_days} Hari`}
                                />

                                <Divider sx={{ my: 2 }} />

                                <InfoItem
                                    title="Hak Cuti Tahunan"
                                    value={`${detail.leave_balance} Hari`}
                                />

                                {detail.leave_type === "CUTI" && (
                                    <>
                                        <Divider sx={{ my: 2 }} />

                                        <InfoItem
                                            title="Sisa Setelah Disetujui"
                                            value={`${detail.remaining_leave} Hari`}
                                        />
                                    </>
                                )}
                            </>
                        )}
                        {isAttendanceEdit && (
                            <>
                                <Divider sx={{ my: 2 }} />

                                <InfoItem
                                    title="Jenis Pengajuan"
                                    value="Perubahan Absensi"
                                />

                                <Divider sx={{ my: 2 }} />

                                <InfoItem
                                    title="Tanggal"
                                    value={formatDate(detail.attendance_date)}
                                />

                                <Divider sx={{ my: 2 }} />

                                <InfoItem
                                    title="Jam Masuk"
                                    value={
                                        <>
                                            {formatTime(detail.old_check_in)}
                                            {" → "}
                                            {formatTime(detail.new_check_in)}
                                        </>
                                    }
                                />

                                <Divider sx={{ my: 2 }} />

                                <InfoItem
                                    title="Jam Pulang"
                                    value={
                                        <>
                                            {formatTime(detail.old_check_out)}
                                            {" → "}
                                            {formatTime(detail.new_check_out)}
                                        </>
                                    }
                                />
                            </>
                        )}

                        <Divider sx={{ my: 2 }} />

                        <Typography
                            fontWeight={600}
                            mb={1}
                        >
                            Alasan
                        </Typography>

                        <Typography
                            color="text.secondary"
                        >
                            {detail.reason}
                        </Typography>

                        <Divider sx={{ my: 2 }} />

                        <Typography
                            fontWeight={600}
                            mb={1}
                        >
                            Lampiran
                        </Typography>

                        {

                            detail.attachment

                                ?

                                <Button>

                                    Lihat Lampiran

                                </Button>

                                :

                                <Typography
                                    color="text.secondary"
                                >

                                    Tidak ada lampiran

                                </Typography>

                        }
                        {!isAttendanceEdit &&
                            detail.leave_type === "SAKIT" && (
                                <>
                                    <Divider sx={{ my: 2 }} />

                                    <Typography
                                        fontWeight={600}
                                        mb={1}
                                    >
                                        Potong Cuti Tahunan?
                                    </Typography>

                                    <Stack
                                        direction="row"
                                        spacing={1}
                                    >
                                        <Button
                                            variant={
                                                deductLeave
                                                    ? "contained"
                                                    : "outlined"
                                            }
                                            color="success"
                                            onClick={() =>
                                                setDeductLeave(true)
                                            }
                                        >
                                            Ya
                                        </Button>

                                        <Button
                                            variant={
                                                !deductLeave
                                                    ? "contained"
                                                    : "outlined"
                                            }
                                            color="inherit"
                                            onClick={() =>
                                                setDeductLeave(false)
                                            }
                                        >
                                            Tidak
                                        </Button>
                                    </Stack>

                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mt: 1 }}
                                    >
                                        Pilih "Ya" jika pengajuan sakit ini
                                        akan mengurangi saldo cuti tahunan.
                                    </Typography>
                                </>
                            )}
                    </CardContent>

                </Card>

                <Stack
                    spacing={2}
                    sx={{
                        mt: 4,
                        mb: 2
                    }}
                >

                    <Stack spacing={2} mt={4}>

                        <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            size="large"
                            onClick={() => {
                                setAction("REJECT");
                                setNote("");
                            }}
                        >
                            Reject
                        </Button>

                        <Button
                            fullWidth
                            variant="contained"
                            color="success"
                            size="large"
                            disabled={
                                !isAttendanceEdit &&
                                !detail.can_approve
                            }
                            onClick={() => {
                                setAction("APPROVE");
                                setNote("");
                            }}
                        >
                            Approve
                        </Button>

                    </Stack>

                </Stack>
                <Drawer
                    anchor="bottom"
                    open={Boolean(action)}
                    onClose={() => setAction(null)}
                    PaperProps={{
                        sx: {
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                        }
                    }}
                >
                    <Stack
                        spacing={3}
                        sx={{
                            p: 3
                        }}
                    >

                        <Box>

                            <Typography
                                variant="h6"
                                fontWeight={700}
                            >
                                {
                                    action === "APPROVE"
                                        ? "Approve Pengajuan"
                                        : "Reject Pengajuan"
                                }
                            </Typography>

                            <Typography
                                color="text.secondary"
                                mt={1}
                            >
                                {
                                    action === "APPROVE"
                                        ? "Catatan (Opsional)"
                                        : "Alasan Penolakan"
                                }
                            </Typography>

                        </Box>

                        <TextField
                            fullWidth
                            multiline
                            rows={5}
                            placeholder={
                                action === "APPROVE"
                                    ? "Tambahkan catatan..."
                                    : "Masukkan alasan penolakan..."
                            }
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />

                        <Stack
                            direction="row"
                            spacing={2}
                        >

                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => setAction(null)}
                            >
                                Batal
                            </Button>

                            <Button
                                fullWidth
                                variant="contained"
                                color={
                                    action === "APPROVE"
                                        ? "success"
                                        : "error"
                                }
                                disabled={saving}
                                onClick={handleSubmit}
                            >
                                {saving
                                    ? "Memproses..."
                                    : action === "APPROVE"
                                        ? "Approve"
                                        : "Reject"}
                            </Button>

                        </Stack>

                    </Stack>

                </Drawer>

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={2500}
                    anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "center"
                    }}
                    sx={{
                        bottom: action ? 320 : 90
                    }}
                    onClose={() =>
                        setSnackbar({
                            ...snackbar,
                            open: false
                        })
                    }
                >
                    <Alert
                        severity={snackbar.severity}
                        variant="filled"
                        sx={{
                            width: "100%"
                        }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </Box>
    );



}

function InfoItem({

    title,

    value

}) {

    return (

        <Box>

            <Typography

                fontSize={13}
                fontWeight={700}
                color="text.primary"

            >

                {title}

            </Typography>

            <Typography

                mt={.5}

                fontWeight={600}

            >

                {value}

            </Typography>

        </Box>

    );

}
