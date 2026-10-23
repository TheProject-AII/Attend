import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Stack,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField
} from "@mui/material";

import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import overtimeService from "../../services/overtimeService";
import Swal from "sweetalert2";

export default function OvertimeApprovalDetail() {

    const { id } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [rejectDialog, setRejectDialog] = useState(false);
    const [rejectNote, setRejectNote] = useState("");

    useEffect(() => {

        const loadDetail = async () => {

            try {

                setLoading(true);

                const response =
                    await overtimeService.managerDetail(id);

                setData(
                    response.data?.data ||
                    response.data
                );

            } catch (err) {

                console.error(
                    "OVERTIME DETAIL ERROR:",
                    err
                );

            } finally {

                setLoading(false);

            }

        };

        loadDetail();

    }, [id]);

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

        const hours =
            Math.floor(minutes / 60);

        const remaining =
            minutes % 60;

        if (remaining === 0) {
            return `${hours} jam`;
        }

        return `${hours} jam ${remaining} menit`;

    };

    if (loading) {

        return (
            <Box p={3}>
                <Typography>
                    Memuat detail...
                </Typography>
            </Box>
        );

    }

    if (!data) {

        return (
            <Box p={3}>

                <Typography>
                    Data lembur tidak ditemukan.
                </Typography>

                <Button
                    sx={{ mt: 2 }}
                    onClick={() =>
                        navigate("/employee/approval")
                    }
                >
                    Kembali
                </Button>

            </Box>
        );

    }

    const handleApprove = async () => {

        try {

            setProcessing(true);

            await overtimeService.approveByManager(
                id
            );


            // =====================================
            // ALERT BERHASIL
            // =====================================

            await Swal.fire({
                icon: "success",
                title: "Berhasil",
                text: "Pengajuan lembur berhasil disetujui.",
                confirmButtonText: "OK",
            });


            // =====================================
            // BARU KEMBALI KE LIST
            // =====================================

            navigate("/employee/approval");


        } catch (err) {

            console.error(
                "APPROVE OVERTIME ERROR:",
                err
            );


            Swal.fire({
                icon: "error",
                title: "Gagal",
                text:
                    err.response?.data?.message ||
                    "Gagal menyetujui pengajuan lembur.",
                confirmButtonText: "OK",
            });


        } finally {

            setProcessing(false);

        }

    };

    const handleReject = async () => {

        if (!rejectNote.trim()) {

            Swal.fire({
                icon: "warning",
                title: "Alasan Wajib Diisi",
                text: "Silakan masukkan alasan penolakan.",
                confirmButtonText: "OK",
            });

            return;
        }


        try {

            setProcessing(true);

            await overtimeService.rejectByManager(
                id,
                rejectNote.trim()
            );


            // Tutup dialog dulu
            setRejectDialog(false);
            setRejectNote("");


            // Baru tampilkan SweetAlert
            await Swal.fire({
                icon: "success",
                title: "Berhasil",
                text: "Pengajuan lembur berhasil ditolak.",
                confirmButtonText: "OK",
                customClass: {
                    container: "swal2-over-mui"
                }
            });


            // Kembali ke list
            navigate("/employee/approval");


        } catch (err) {

            console.error(
                "REJECT OVERTIME ERROR:",
                err
            );


            Swal.fire({
                icon: "error",
                title: "Gagal",
                text:
                    err.response?.data?.message ||
                    "Gagal menolak pengajuan lembur.",
                confirmButtonText: "OK",
            });


        } finally {

            setProcessing(false);

        }

    };
    return (

        <Box
            sx={{
                p: 2,
                pb: 10
            }}
        >

            <Typography
                variant="h5"
                fontWeight={700}
            >
                Detail Pengajuan Lembur
            </Typography>

            <Typography
                color="text.secondary"
                sx={{ mb: 2 }}
            >
                Detail pengajuan lembur karyawan
            </Typography>

            <Card>

                <CardContent>

                    <Stack spacing={2}>

                        <Box>

                            <Typography
                                color="text.secondary"
                                variant="body2"
                            >
                                Nama Karyawan
                            </Typography>

                            <Typography
                                fontWeight={600}
                            >
                                {data.name || "-"}
                            </Typography>

                        </Box>

                        <Box>

                            <Typography
                                color="text.secondary"
                                variant="body2"
                            >
                                Email
                            </Typography>

                            <Typography
                                fontWeight={600}
                            >
                                {data.email || "-"}
                            </Typography>

                        </Box>

                        <Box>

                            <Typography
                                color="text.secondary"
                                variant="body2"
                            >
                                Tanggal Lembur
                            </Typography>

                            <Typography
                                fontWeight={600}
                            >
                                {formatDate(
                                    data.overtime_date
                                )}
                            </Typography>

                        </Box>

                        <Box>

                            <Typography
                                color="text.secondary"
                                variant="body2"
                            >
                                Jam Lembur
                            </Typography>

                            <Typography
                                fontWeight={600}
                            >
                                {formatTime(
                                    data.start_time
                                )}
                                {" - "}
                                {formatTime(
                                    data.end_time
                                )}
                            </Typography>

                        </Box>

                        <Box>

                            <Typography
                                color="text.secondary"
                                variant="body2"
                            >
                                Durasi
                            </Typography>

                            <Typography
                                fontWeight={600}
                            >
                                {formatDuration(
                                    data.duration_minutes
                                )}
                            </Typography>

                        </Box>

                        <Box>

                            <Typography
                                color="text.secondary"
                                variant="body2"
                            >
                                Pekerjaan / Alasan
                            </Typography>

                            <Typography>
                                {data.reason || "-"}
                            </Typography>

                        </Box>

                        <Box>

                            <Typography
                                color="text.secondary"
                                variant="body2"
                            >
                                Status
                            </Typography>

                            <Chip
                                label={
                                    data.status ===
                                        "PENDING_MANAGER"
                                        ? "Pending"
                                        : data.status
                                }
                                color="warning"
                                size="small"
                            />

                        </Box>

                    </Stack>

                </CardContent>

            </Card>

            <Dialog
                open={rejectDialog}
                onClose={() => {
                    if (!processing) {
                        setRejectDialog(false);
                    }
                }}
                fullWidth
                maxWidth="sm"
            >

                <DialogTitle>
                    Tolak Pengajuan Lembur
                </DialogTitle>

                <DialogContent>

                    <Typography
                        color="text.secondary"
                        sx={{ mb: 2 }}
                    >
                        Masukkan alasan penolakan pengajuan lembur.
                    </Typography>

                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Alasan Penolakan"
                        placeholder="Contoh: Pekerjaan lembur tidak diperlukan..."
                        value={rejectNote}
                        onChange={(e) =>
                            setRejectNote(e.target.value)
                        }
                        disabled={processing}
                    />

                </DialogContent>

                <DialogActions>

                    <Button
                        onClick={() =>
                            setRejectDialog(false)
                        }
                        disabled={processing}
                    >
                        Batal
                    </Button>

                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleReject}
                        disabled={
                            processing ||
                            !rejectNote.trim()
                        }
                    >
                        {processing
                            ? "Memproses..."
                            : "Tolak Pengajuan"}
                    </Button>

                </DialogActions>

            </Dialog>

            <Stack
                direction="row"
                spacing={2}
                sx={{ mt: 2 }}
            >

                <Button
                    fullWidth
                    variant="outlined"
                    onClick={() =>
                        navigate("/employee/approval")
                    }
                    disabled={processing}
                >
                    Kembali
                </Button>

                {data.status === "PENDING_MANAGER" && (
                    <>
                        <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            onClick={() => {
                                setRejectNote("");
                                setRejectDialog(true);
                            }}
                            disabled={processing}
                        >
                            Tolak
                        </Button>

                        <Button
                            fullWidth
                            variant="contained"
                            color="success"
                            onClick={handleApprove}
                            disabled={processing}
                        >
                            {processing
                                ? "Memproses..."
                                : "Setujui"}
                        </Button>
                    </>
                )}



            </Stack>

        </Box>

    );

}